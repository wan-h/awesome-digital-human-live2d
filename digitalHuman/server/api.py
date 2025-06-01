# -*- coding: utf-8 -*-
"""
@File    :   api.py
@Author  :   一力辉
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .agentApi import router as agentRouter
from .asrApi import router as asrRouter
from .commonApi import router as commonRouter
from .llmApi import router as llmRouter
from .streamingAsrApi import router as streamingAsrRouter
from .ttsApi import router as ttsRouter

__all__ = ["app"]

app = FastAPI(
    title="Awesome Digital Human",
    description="This is a cool set of apis for Awesome Digital Human",
    version="0.0.1",
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
app.include_router(
    streamingAsrRouter, prefix="/adh/streaming_asr", tags=["StreamingASR"]
)
