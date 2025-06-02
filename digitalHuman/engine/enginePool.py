# -*- coding: utf-8 -*-
'''
@File    :   enginePool.py
@Author  :   一力辉 
'''

from threading import RLock
from typing import List
from collections import defaultdict
from yacs.config import CfgNode as CN
from digitalHuman.utils import logger
from digitalHuman.protocol import ENGINE_TYPE
from .engineBase import BaseEngine
from .asr import ASRFactory
from .tts import TTSFactory
from .llm import LLMFactory

__all__ = ["EnginePool"]

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
            self._pool[ENGINE_TYPE.ASR][asrCfg.NAME] = ASRFactory.create(asrCfg)
            logger.info(f"[EnginePool] ASR Engine {asrCfg.NAME} is created.")
        logger.info(f"[EnginePool] ASR Engine default is {config.ASR.DEFAULT}.")
        # tts
        for ttsCfg in config.TTS.SUPPORT_LIST:
            self._pool[ENGINE_TYPE.TTS][ttsCfg.NAME] = TTSFactory.create(ttsCfg)
            logger.info(f"[EnginePool] TTS Engine {ttsCfg.NAME} is created.")
        logger.info(f"[EnginePool] TTS Engine default is {config.TTS.DEFAULT}.")
        # llm
        for llmCfg in config.LLM.SUPPORT_LIST:
            self._pool[ENGINE_TYPE.LLM][llmCfg.NAME] = LLMFactory.create(llmCfg)
            logger.info(f"[EnginePool] LLM Engine {llmCfg.NAME} is created.")
        logger.info(f"[EnginePool] LLM Engine default is {config.LLM.DEFAULT}.")
    
    def listEngine(self, engineType: ENGINE_TYPE) -> List[str]:
        if engineType not in self._pool: return []
        return self._pool[engineType].keys()
            
    def getEngine(self, engineType: ENGINE_TYPE, engineName: str) -> BaseEngine:
        if engineType not in self._pool:
            raise KeyError(f"[EnginePool] No such engine type: {engineType}")
        if engineName not in self._pool[engineType]:
            raise KeyError(f"[EnginePool] No such engine: {engineName}")
        return self._pool[engineType][engineName]