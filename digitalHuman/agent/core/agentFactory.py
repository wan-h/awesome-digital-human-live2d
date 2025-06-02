# -*- coding: utf-8 -*-
'''
@File    :   agentFactory.py
@Author  :   一力辉 
'''

from ..builder import AGENTS
from ..agentBase import BaseAgent
from typing import List
from yacs.config import CfgNode as CN
from digitalHuman.utils import logger
from digitalHuman.protocol import ENGINE_TYPE

class AgentFactory():
    """
    Agent Factory
    """
    @staticmethod
    def create(config: CN) -> BaseAgent:
        if config.NAME in AGENTS.list():
            logger.info(f"[AgentFactory] Create instance: {config.NAME}")
            return AGENTS.get(config.NAME)(config, ENGINE_TYPE.AGENT)
        else:
            raise RuntimeError(f"[AgentFactory] Please check config, support AGENT engine: {AGENTS.list()}")
    @staticmethod
    def list() -> List:
        return AGENTS.list()