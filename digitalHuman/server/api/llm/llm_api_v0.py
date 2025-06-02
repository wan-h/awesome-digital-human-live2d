# -*- coding: utf-8 -*-
'''
@File    :   asrApi.py
@Author  :   一力辉 
'''

from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse
from digitalHuman.protocol import TextMessage
from digitalHuman.engine import EnginePool
from digitalHuman.server.reponse import Response, streamInteralError
from digitalHuman.server.header import HeaderInfo
from digitalHuman.server.models import *
from digitalHuman.server.core.api_llm_v0_impl import *

router = APIRouter(prefix="/llm/v0")
enginePool = EnginePool()

# ========================= 获取asr支持列表 ===========================
@router.get("/engine", response_model=EngineListResp, summary="Get LLM Engine List")
def api_get_llm_list():
    """
    获取asr支持引擎列表
    """
    response = Response()
    try:
        response.data = get_llm_list()
    except Exception as e:
        response.data = []
        response.error(str(e))
    return JSONResponse(content=response.validate(EngineListResp), status_code=200)

# ========================= 获取asr默认引擎 ===========================
@router.get("/engine/default", response_model=EngineDefaultResp, summary="Get Default LLM Engine")
def api_get_asr_default():
    """
    获取默认asr引擎
    """
    response = Response()
    try:
        response.data = get_llm_default()
    except Exception as e:
        response.data = ""
        response.error(str(e))
    return JSONResponse(content=response.validate(EngineDefaultResp), status_code=200)


# ========================= 获取asr引擎参数列表 ===========================
@router.get("/engine/{engine}", response_model=EngineParam, summary="Get LLM Engine param")
def api_get_asr_param(engine: str):
    """
    获取asr引擎配置参数列表
    """
    response = Response()
    try:
        response.data = get_llm_param(engine)
    except Exception as e:
        response.data = []
        response.error(str(e))
    return JSONResponse(content=response.validate(EngineParam), status_code=200)


# ========================= 执行asr引擎 ===========================
@router.post("/engine", response_model=ASREngineOutput, summary="LLM Inference")

async def api_agent_infer(item: LLMEngineInput, header: HeaderInfo):
    if item.engine.lower() == "default":
        item.engine = config.SERVER.LLM.DEFAULT
    response = Response()
    try:
        input = TextMessage(data=item.data)
        return StreamingResponse(enginePool.getEngine(ENGINE_TYPE.LLM, item.engine).run(input=input, user=header, **item.config), media_type="text/event-stream")
    except Exception as e:
        response.error(str(e))
        return StreamingResponse(streamInteralError("Interal Error"), media_type="text/event-stream")