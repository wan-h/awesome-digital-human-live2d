# -*- coding: utf-8 -*-
'''
@File    :   agentApi.py
@Author  :   一力辉 
'''

from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse
from digitalHuman.utils import config
from digitalHuman.agent import AgentPool
from digitalHuman.server.reponse import Response, streamInteralError
from digitalHuman.server.header import HeaderInfo
from digitalHuman.server.models import *
from digitalHuman.server.core.api_agent_v0_impl import *

router = APIRouter(prefix="/agent/v0")
agentPool = AgentPool()


# ========================= 获取agent支持列表 ===========================
@router.get("/engine", response_model=EngineListResp, summary="Get Agent Engine List")
def api_get_agent_list():
    """
    获取agent支持引擎列表
    """
    response = Response()
    try:
        response.data = get_agent_list()
    except Exception as e:
        response.data = []
        response.error(str(e))
    return JSONResponse(content=response.validate(EngineListResp), status_code=200)

# ========================= 获取agent默认引擎 ===========================
@router.get("/engine/default", response_model=EngineDefaultResp, summary="Get Default Agent Engine")
def api_get_agent_default():
    """
    获取默认agent引擎
    """
    response = Response()
    try:
        response.data = get_agent_default()
    except Exception as e:
        response.data = ""
        response.error(str(e))
    return JSONResponse(content=response.validate(EngineDefaultResp), status_code=200)


# ========================= 获取agent引擎参数列表 ===========================
@router.get("/engine/{engine}", response_model=EngineParam, summary="Get Agent Engine Param")
def api_get_agent_param(engine: str):
    """
    获取agent引擎配置参数列表
    """
    response = Response()
    try:
        response.data = get_agent_param(engine)
    except Exception as e:
        response.data = []
        response.error(str(e))
    return JSONResponse(content=response.validate(EngineParam), status_code=200)

# ========================= 创建agent会话 ===========================
@router.post("/engine/{engine}", response_model=ConversationIdResp, summary="Create Agent Conversation")
async def api_create_agent_conversation(engine: str, item: ConversationInput):
    """
    创建agent会话
    """
    response = Response()
    try: 
        response.data = await create_agent_conversation(engine, item.data)
    except Exception as e:
        response.data = ""
        response.error(str(e))
    return JSONResponse(content=response.validate(ConversationIdResp), status_code=200)

# ========================= 执行agent引擎 ===========================
@router.post("/engine", summary="AI Agent Inference")
async def api_agent_infer(items: AgentEngineInput, header: HeaderInfo):
    if items.engine.lower() == "default":
        items.engine = config.SERVER.AGENTS.DEFAULT
    response = Response()
    try:
        streamContent = agent_infer_stream(header, items)
        return StreamingResponse(streamContent, media_type="text/event-stream")
    except Exception as e:
        response.error(str(e))
        return StreamingResponse(streamInteralError("Interal Error"), media_type="text/event-stream")