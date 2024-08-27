# -*- coding: utf-8 -*-
'''
@File    :   enginePool.py
@Author  :   一力辉 
'''

from threading import RLock
from enum import Enum
from typing import Optional
from collections import defaultdict
from yacs.config import CfgNode as CN
from digitalHuman.utils import logger
from .engineBase import BaseEngine
from .asr import ASRFactory
from .llm import LLMFactory
from .tts import TTSFactory

__all__ = ["EnginePool", "EngineType"]

class EngineType(Enum):
    """
    Engine Type
    """
    ASR   = "ENGINE_TYPE_ASR"
    TTS   = "ENGINE_TYPE_TTS"
    LLM   = "ENGINE_TYPE_LLM"

class EnginePool():
    singleLock = RLock()
    _init = False

    def __init__(self):
        if not self._init:
            self._pool = defaultdict(dict)
            self._init = True
    
    # Single Instance
    def __new__(cls, *args, **kwargs):
        with EnginePool.singleLock:
            if not hasattr(cls, '_instance'):
                EnginePool._instance = super().__new__(cls)
        return EnginePool._instance

    def __del__(self):
        self._pool.clear()
        self._init = False
    
    def setup(self, config: CN):
        # asr
        for asrCfg in config.ASR.SUPPORT_LIST:
            self._pool[EngineType.ASR][asrCfg.NAME] = ASRFactory.create(asrCfg)
            logger.info(f"[EnginePool] ASR Engine {asrCfg.NAME} is created.")
        logger.info(f"[EnginePool] ASR Engine default is {config.ASR.DEFAULT}.")
        # llm
        for llmCfg in config.LLM.SUPPORT_LIST:
            self._pool[EngineType.LLM][llmCfg.NAME] = LLMFactory.create(llmCfg)
            logger.info(f"[EnginePool] LLM Engine {llmCfg.NAME} is created.")
        logger.info(f"[EnginePool] LLM Engine default is {config.LLM.DEFAULT}.")
        # tts
        for ttsCfg in config.TTS.SUPPORT_LIST:
            self._pool[EngineType.TTS][ttsCfg.NAME] = TTSFactory.create(ttsCfg)
            logger.info(f"[EnginePool] TTS Engine {ttsCfg.NAME} is created.")
        logger.info(f"[EnginePool] TTS Engine default is {config.TTS.DEFAULT}.")
            
    def getEngine(self, engineType: EngineType, engineName: str) -> Optional[BaseEngine]:
        if engineType not in self._pool:
            logger.error(f"[EnginePool] No such engine type: {engineType}")
            return None
        if engineName not in self._pool[engineType]:
            logger.error(f"[EnginePool] No such engine: {engineName}")
            return None
        return self._pool[engineType][engineName]