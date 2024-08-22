# -*- coding: utf-8 -*-
'''
@File    :   agentApi.py
@Author  :   一力辉 
'''

from .reponse import BaseResponse, Response
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse
from digitalHuman.utils import config
from digitalHuman.utils import TextMessage
from digitalHuman.agent import AgentPool

router = APIRouter()
agentPool = AgentPool()

class AgentInferIn(BaseModel):
    engine: str = "default"
    settings: dict = {}
    streaming: bool = False
    data: str

class AgentInferOut(BaseResponse):
    data: bytes

async def interalError():
    yield "内部错误"

@router.post("/v0/infer", response_model=AgentInferOut, summary="AI Agent Inference")
async def apiAgentInfer(item: AgentInferIn):
    if item.engine.lower() == "default":
        item.engine = config.SERVER.AGENTS.DEFAULT
    response = Response()
    try:
        input = TextMessage(data=item.data)
        return StreamingResponse(agentPool.get(item.engine).run(input, item.streaming, **item.settings))
    except Exception as e:
        response.error(str(e))
        return StreamingResponse(interalError)


class AgentSettingsIn(BaseModel):
    engine: str

class AgentSettings(BaseResponse):
    NAME: str
    DEFAULT: str

class AgentSettingsOut(BaseResponse):
    data: List[AgentSettings]

@router.post("/v0/settings", response_model=AgentSettingsOut, summary="Get AI Agent Settings")
async def apiAgentSettings(item: AgentSettingsIn):
    response = Response()
    try:
        response.data = agentPool.get(item.engine).parameters()
    except Exception as e:
        response.error(str(e))
    return JSONResponse(content=response.validate(AgentSettingsOut), status_code=200)


class AgentListOut(BaseResponse):
    data: List[str] = []

@router.get("/v0/list", response_model=AgentListOut, summary="Get AI Agent List")
async def apiAgentList():
    response = Response()
    try:
        response.data = agentPool.list()
    except Exception as e:
        response.error(str(e))
    return JSONResponse(content=response.validate(AgentListOut), status_code=200)


class AgentDefaultOut(BaseResponse):
    data: str

@router.get("/v0/default", response_model=AgentDefaultOut, summary="Get Default AI Agent")
async def apiAgentDefault():
    response = Response()
    try:
        response.data = config.SERVER.AGENTS.DEFAULT
    except Exception as e:
        response.error(str(e))
    return JSONResponse(content=response.validate(AgentDefaultOut), status_code=200)