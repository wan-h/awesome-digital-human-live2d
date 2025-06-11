# -*- coding: utf-8 -*-
'''
@File    :   api.py
@Author  :   一力辉 
'''

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from digitalHuman.server.api.common.common_api_v0 import router as commonRouter
from digitalHuman.server.api.asr.asr_api_v0 import router as asrRouter
from digitalHuman.server.api.asr.streaming_asr_api_vo import router as asrStreamRouter
from digitalHuman.server.api.tts.tts_api_v0 import router as ttsRouter
from digitalHuman.server.api.llm.llm_api_v0 import router as llmRouter
from digitalHuman.server.api.agent.agent_api_v0 import router as agentRouter
from digitalHuman.utils import config


__all__ = ["app"]

app = FastAPI(
    title=config.COMMON.NAME, 
    description=f"This is a cool set of apis for {config.COMMON.NAME}",
    version=config.COMMON.VERSION
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GLOABLE_PREFIX = "/adh"
# 路由
app.include_router(commonRouter, prefix=GLOABLE_PREFIX, tags=["COMMON"])
app.include_router(asrRouter, prefix=GLOABLE_PREFIX, tags=["ASR"])
app.include_router(asrStreamRouter, prefix=GLOABLE_PREFIX, tags=["Stream ASR"])
app.include_router(ttsRouter, prefix=GLOABLE_PREFIX, tags=["TTS"])
app.include_router(llmRouter, prefix=GLOABLE_PREFIX, tags=["LLM"])
app.include_router(agentRouter, prefix=GLOABLE_PREFIX, tags=["AGENT"])
