# -*- coding: utf-8 -*-
'''
@File    :   asrApi.py
@Author  :   一力辉 
'''

from .reponse import BaseResponse, Response
import base64
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from digitalHuman.utils import config
from digitalHuman.utils import AudioMessage, TextMessage, AudioFormatType
from digitalHuman.engine import EnginePool, EngineType

router = APIRouter()
enginePool = EnginePool()

class InferIn(BaseModel):
    engine: str = "default"
    data: str
    format: str
    sampleRate: int
    sampleWidth: int
    settings: dict = {}

class InferOut(BaseResponse):
    data: Optional[str] = None

@router.post("/v0/infer", response_model=InferOut, summary="Automatic Speech Recognition Inference")
async def apiInfer(item: InferIn):
    if item.engine.lower() == "default":
        item.engine = config.SERVER.ENGINES.ASR.DEFAULT
    response = Response()
    try:
        format = AudioFormatType._value2member_map_.get(item.format)
        if format is None:
            raise RuntimeError("Unsupported audio format")
        input = AudioMessage(data=base64.b64decode(item.data), format=format, sampleRate=item.sampleRate, sampleWidth=item.sampleWidth)
        output: Optional[TextMessage] = await enginePool.getEngine(EngineType.ASR, item.engine).run(input, **item.settings)
        if output is None:
            raise RuntimeError("ASR engine run failed")
        response.data = output.data
    except Exception as e:
        response.data = None
        response.error(str(e))
    return JSONResponse(content=response.validate(InferOut), status_code=200)