# -*- coding: utf-8 -*-
'''
@File    :   api.py
@Author  :   一力辉 
'''

from .commonApi import router as commonRouter
from .asrApi import router as asrRouter
from .agentApi import router as agentRouter
from .llmApi import router as llmRouter
from .ttsApi import router as ttsRouter
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

__all__ = ["app"]

app = FastAPI(
    title="Awesome Digital Human", 
    description="This is a cool set of apis for Awesome Digital Human",
    version="0.0.1"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 路由
app.include_router(commonRouter, prefix="/adh/common", tags=["COMMON"])
app.include_router(asrRouter, prefix="/adh/asr", tags=["ASR"])
app.include_router(llmRouter, prefix="/adh/llm", tags=["LLM"])
app.include_router(ttsRouter, prefix="/adh/tts", tags=["TTS"])
app.include_router(agentRouter, prefix="/adh/agent", tags=["AGENT"])