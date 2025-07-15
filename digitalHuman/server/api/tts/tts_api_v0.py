# -*- coding: utf-8 -*-
'''
@File    :   ttsApi.py
@Author  :   一力辉 
'''

import json
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from digitalHuman.utils import config, logger
from digitalHuman.protocol import AudioMessage
from digitalHuman.engine import EnginePool
from digitalHuman.server.reponse import Response
from digitalHuman.server.header import HeaderInfo
from digitalHuman.server.models import *
from digitalHuman.server.core.api_tts_v0_impl import *

router = APIRouter(prefix="/tts/v0")
enginePool = EnginePool()

# ========================= 获取tts支持列表 ===========================
@router.get("/engine", response_model=EngineListResp, summary="Get TTS Engine List")
def api_get_tts_list():
    """
    获取tts支持引擎列表
    """
    response = Response()
    try:
        response.data = get_tts_list()
    except Exception as e:
        response.data = []
        response.error(str(e))
    return JSONResponse(content=response.validate(EngineListResp), status_code=200)

# ========================= 获取tts默认引擎 ===========================
@router.get("/engine/default", response_model=EngineDefaultResp, summary="Get Default TTS Engine")
def api_get_tts_default():
    """
    获取默认tts引擎
    """
    response = Response()
    try:
        response.data = get_tts_default()
    except Exception as e:
        response.data = ""
        response.error(str(e))
    return JSONResponse(content=response.validate(EngineDefaultResp), status_code=200)

# ========================= 获取tts引擎声音列表 ===========================
@router.get("/engine/{engine}/voice", response_model=VoiceListResp, summary="Get TTS Engine Voice List")
async def api_get_tts_voice(engine: str, config: str = '{}'):
    """
    获取tts引擎配置参数列表
    """
    response = Response()
    config = json.loads(config) if config else {}
    try:
        response.data = await get_tts_voice(engine, **config)
    except Exception as e:
        response.data = []
        response.error(str(e))
    return JSONResponse(content=response.validate(VoiceListResp), status_code=200)


# ========================= 获取tts引擎参数列表 ===========================
@router.get("/engine/{engine}", response_model=EngineParam, summary="Get TTS Engine Param")
def api_get_tts_param(engine: str):
    """
    获取tts引擎配置参数列表
    """
    response = Response()
    try:
        response.data = get_tts_param(engine)
    except Exception as e:
        response.data = []
        response.error(str(e))
    return JSONResponse(content=response.validate(EngineParam), status_code=200)


# ========================= 执行tts引擎 ===========================
@router.post("/engine", response_model=TTSEngineOutput, summary="Text To Speech Inference")
async def api_tts_infer(item: TTSEngineInput, header: HeaderInfo):
    """
    执行tts引擎
    """
    if item.engine.lower() == "default":
        item.engine = config.SERVER.ENGINES.TTS.DEFAULT
    response = Response()
    try:
        output: AudioMessage = await tts_infer(header, item)
        response.data = output.data
        response.sampleRate = output.sampleRate
        response.sampleWidth = output.sampleWidth
    except Exception as e:
        response.data = None
        response.error(str(e))
    return JSONResponse(content=response.validate(TTSEngineOutput), status_code=200)