# -*- coding: utf-8 -*-
'''
@File    :   ttsFactory.py
@Author  :   一力辉 
'''

from ..builder import LLMEngines
from ..engineBase import BaseEngine
from typing import List
from yacs.config import CfgNode as CN
from digitalHuman.protocol import ENGINE_TYPE
from digitalHuman.utils import logger

__all__ = ["LLMFactory"]

class LLMFactory():
    """
    Large Language Model Factory
    """
    @staticmethod
    def create(config: CN) -> BaseEngine:
        if config.NAME in LLMEngines.list():
            logger.info(f"[LLMFactory] Create engine: {config.NAME}")
            return LLMEngines.get(config.NAME)(config, ENGINE_TYPE.LLM)
        else:
            raise RuntimeError(f"[LLMFactory] Please check config, support LLM: {LLMEngines.list()}")
    @staticmethod
    def list() -> List:
        return LLMEngines.list()