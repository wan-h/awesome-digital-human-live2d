# -*- coding: utf-8 -*-
'''
@File    :   llmApi.py
@Author  :   一力辉 
'''

from .reponse import BaseResponse, Response
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from digitalHuman.utils import config
from digitalHuman.utils import TextMessage
from digitalHuman.engine import EnginePool, EngineType

router = APIRouter()
enginePool = EnginePool()

class InferIn(BaseModel):
    engine: Optional[str] = config.SERVER.ENGINES.LLM.DEFAULT
    data: str

class InferOut(BaseResponse):
    data: Optional[str]

@router.post("/v0/infer", response_model=InferOut, summary="Large Lanuage Model Inference")
async def apiInfer(item: InferIn):
    response = Response()
    try:
        input = TextMessage(data=item.data)
        output: Optional[TextMessage] = await enginePool.getEngine(EngineType.LLM, item.engine).run(input)
        if output is None:
            raise RuntimeError("LLM engine run failed")
        response.data = output.data
    except Exception as e:
        response.data = None
        response.error(str(e))
    return JSONResponse(content=response.validate(InferOut), status_code=200)