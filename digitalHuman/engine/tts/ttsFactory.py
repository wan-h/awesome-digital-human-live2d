# -*- coding: utf-8 -*-
'''
@File    :   ttsFactory.py
@Author  :   一力辉 
'''

from ..builder import TTSEngines
from ..engineBase import BaseEngine
from typing import List
from yacs.config import CfgNode as CN
from digitalHuman.utils import logger

__all__ = ["TTSFactory"]

class TTSFactory():
    """
    Text to Speech Factory
    """
    @staticmethod
    def create(config: CN) -> BaseEngine:
        if config.NAME in TTSEngines.list():
            logger.info(f"[TTSFactory] Create engine: {config.NAME}")
            return TTSEngines.get(config.NAME)(config)
        else:
            raise RuntimeError(f"[TTSFactory] Please check config, support TTS: {TTSEngines.list()}")
    @staticmethod
    def list() -> List:
        return TTSEngines.list()