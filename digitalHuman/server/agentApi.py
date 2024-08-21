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

class InferIn(BaseModel):
    engine: str = "default"
    settings: dict = {}
    streaming: bool = False
    data: str

class InferOut(BaseResponse):
    data: bytes

async def interalError():
    yield "内部错误"

@router.post("/v0/infer", response_model=InferOut, summary="AI Agent Inference")
async def apiInfer(item: InferIn):
    if item.engine.lower() == "default":
        item.engine = config.SERVER.AGENTS.DEFAULT
    response = Response()
    try:
        input = TextMessage(data=item.data)
        # dify服务参数校验
        if "dify" in item.engine.lower():
            if "url" not in item.settings or "key" not in item.settings:
                raise RuntimeError("dify url and key is required")
            
        return StreamingResponse(agentPool.get(item.engine).run(input, item.streaming, **item.settings))
    except Exception as e:
        response.error(str(e))
        return StreamingResponse(interalError)


class ListOut(BaseResponse):
    data: List[str] = []

@router.get("/v0/list", response_model=ListOut, summary="Get AI Agent List")
async def apiList():
    response = Response()
    try:
        response.data = agentPool.list()
    except Exception as e:
        response.error(str(e))
    return JSONResponse(content=response.validate(ListOut), status_code=200)


class DefaultOut(BaseResponse):
    data: str

@router.get("/v0/default", response_model=DefaultOut, summary="Get Default AI Agent")
async def apiList():
    response = Response()
    try:
        print("=" * 100)
        print(config.SERVER.AGENTS.DEFAULT)
        response.data = config.SERVER.AGENTS.DEFAULT
    except Exception as e:
        response.error(str(e))
    return JSONResponse(content=response.validate(DefaultOut), status_code=200)