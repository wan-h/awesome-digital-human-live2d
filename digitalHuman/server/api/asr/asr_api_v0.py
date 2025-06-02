# -*- coding: utf-8 -*-
'''
@File    :   asrApi.py
@Author  :   一力辉 
'''

import json
from fastapi import APIRouter, UploadFile, Form, File
from fastapi.responses import JSONResponse
from digitalHuman.protocol import TextMessage, AUDIO_TYPE
from digitalHuman.engine import EnginePool
from digitalHuman.server.reponse import Response
from digitalHuman.server.header import HeaderInfo
from digitalHuman.server.models import *
from digitalHuman.server.core.api_asr_v0_impl import *

router = APIRouter(prefix="/asr/v0")
enginePool = EnginePool()

# ========================= 获取asr支持列表 ===========================
@router.get("/engine", response_model=EngineListResp, summary="Get ASR Engine List")
def api_get_asr_list():
    """
    获取asr支持引擎列表
    """
    response = Response()
    try:
        response.data = get_asr_list()
    except Exception as e:
        response.data = []
        response.error(str(e))
    return JSONResponse(content=response.validate(EngineListResp), status_code=200)

# ========================= 获取asr默认引擎 ===========================
@router.get("/engine/default", response_model=EngineDefaultResp, summary="Get Default ASR Engine")
def api_get_asr_default():
    """
    获取默认asr引擎
    """
    response = Response()
    try:
        response.data = get_asr_default()
    except Exception as e:
        response.data = ""
        response.error(str(e))
    return JSONResponse(content=response.validate(EngineDefaultResp), status_code=200)


# ========================= 获取asr引擎参数列表 ===========================
@router.get("/engine/{engine}", response_model=EngineParam, summary="Get ASR Engine param")
def api_get_asr_param(engine: str):
    """
    获取asr引擎配置参数列表
    """
    response = Response()
    try:
        response.data = get_asr_param(engine)
    except Exception as e:
        response.data = []
        response.error(str(e))
    return JSONResponse(content=response.validate(EngineParam), status_code=200)


# ========================= 执行asr引擎 ===========================
# wav 二进制
@router.post("/engine", response_model=ASREngineOutput, summary="Speech To Text Inference (wav binary)")
async def api_asr_infer(header: HeaderInfo, items: ASREngineInput):
    """
    执行asr引擎
    """
    response = Response()
    try:
        output: TextMessage = await asr_infer(header, items)
        response.data = output.data
    except Exception as e:
        response.data = ""
        response.error(str(e))
    return JSONResponse(content=response.validate(ASREngineOutput), status_code=200)

# mp3 文件
@router.post("/engine/file", response_model=ASREngineOutput, summary="Speech To Text Inference (mp3 file)")
async def api_asr_infer_file(
    header: HeaderInfo, 
    file: UploadFile, 
    engine: str = Form(...),
    type: AUDIO_TYPE = Form(...),
    config: str = Form(...),
    sampleRate: int = Form(...),
    sampleWidth: int = Form(...)
):
    """
    执行asr引擎
    """
    response = Response()
    try:
        fileData = await file.read()
        items = ASREngineInput(
            engine=engine,
            type=type,
            config=json.loads(config),
            sampleRate=sampleRate,
            sampleWidth=sampleWidth,
            data=fileData
        )
        output: TextMessage = await asr_infer(header, items)
        response.data = output.data
    except Exception as e:
        response.data = ""
        response.error(str(e))
    return JSONResponse(content=response.validate(ASREngineOutput), status_code=200)