# -*- coding: utf-8 -*-
'''
@File    :   agentApi.py
@Author  :   一力辉 
'''

from .reponse import BaseResponse, Response
import base64
from enum import Enum
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from digitalHuman.utils import config
from digitalHuman.utils import TextMessage, AudioMessage, AudioFormatType
from digitalHuman.engine import EnginePool, EngineType
from digitalHuman.agent import AgentPool

router = APIRouter()
enginePool = EnginePool()
agentPool = AgentPool()

# 支持的输入格式
# TODO：这里可以实现怎么直接继承AudioFormatType
class AgentInFormatType(Enum):
    """
    Agent In Format Type
    """
    TEXT = "text"
    MP3 = "mp3"
    WAV  = "wav"

    def __str__(self):
        return str(self.value)

class InferIn(BaseModel):
    asrEngine: Optional[str] = config.SERVER.ENGINES.ASR.DEFAULT
    llmEngine: Optional[str] = config.SERVER.ENGINES.LLM.DEFAULT
    ttsEngine: Optional[str] = config.SERVER.ENGINES.TTS.DEFAULT
    engine: Optional[str] = config.SERVER.AGENTS.DEFAULT
    character: Optional[str] = None
    sampleRate: Optional[int] = 0
    sampleWidth: Optional[int] = 0
    format: str
    data: str

class InferOut(BaseResponse):
    data: Optional[str] = None
    desc: Optional[str] = None
    format: str = ""
    sampleRate: int = 0
    sampleWidth: int = 0

@router.post("/v0/infer", response_model=InferOut, summary="Text To Speech")
async def apiInfer(item: InferIn):
    response = Response()
    try:
        if item.format == str(AgentInFormatType.TEXT):
            input = TextMessage(data=item.data)
        else:
            format = AudioFormatType._value2member_map_.get(item.format)
            if format is None:
                raise RuntimeError("Unsupported audio format")
            input = AudioMessage(
                data=base64.b64decode(item.data), 
                format=format, 
                sampleRate=item.sampleRate, 
                sampleWidth=item.sampleWidth
            )
        asrEngine = enginePool.getEngine(EngineType.ASR, item.asrEngine)
        llmEngine = enginePool.getEngine(EngineType.LLM, item.llmEngine)
        ttsEngine = enginePool.getEngine(EngineType.TTS, item.ttsEngine)
        output: AudioMessage = await agentPool.get(item.engine).run(
            input, 
            asrEngine=asrEngine, 
            llmEngine=llmEngine, 
            ttsEngine=ttsEngine, 
            character=item.character
        )
        if output is None:
            raise RuntimeError("Agent engine run failed")
        response.data = base64.b64encode(output.data).decode('utf-8')
        response.desc = output.desc
        response.format = str(output.format)
        response.sampleRate = output.sampleRate
        response.sampleWidth = output.sampleWidth
    except Exception as e:
        response.data = None
        response.error(str(e))
    return JSONResponse(content=response.validate(InferOut), status_code=200)