# -*- coding: utf-8 -*-
'''
@File    :   common.py
@Author  :   一力辉 
'''

from .reponse import BaseResponse, Response
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()

class OutItem(BaseResponse):
    data: int = 1

@router.get("/v0/heartbeat", response_model=OutItem, summary="Hearbeat From System")
async def apiInfer():
    response = Response()
    response.ok("SUCCESS")
    return JSONResponse(content=response.validate(OutItem), status_code=200)