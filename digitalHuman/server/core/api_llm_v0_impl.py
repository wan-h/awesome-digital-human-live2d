# -*- coding: utf-8 -*-
'''
@File    :   api_llm_v0_impl.py
@Author  :   一力辉
'''


from typing import List
from digitalHuman.engine import EnginePool
from digitalHuman.utils import config
from digitalHuman.protocol import ParamDesc, EngineDesc, ENGINE_TYPE, UserDesc, AudioMessage, TextMessage
from digitalHuman.server.models import LLMEngineInput

enginePool = EnginePool()

def get_llm_list() -> List[EngineDesc]:
    engines = enginePool.listEngine(ENGINE_TYPE.LLM)
    return [enginePool.getEngine(ENGINE_TYPE.LLM, engine).desc() for engine in engines]

def get_llm_default() -> EngineDesc:
    return enginePool.getEngine(ENGINE_TYPE.LLM, config.SERVER.ENGINES.LLM.DEFAULT).desc()

def get_llm_param(name: str) -> List[ParamDesc]:
    engine = enginePool.getEngine(ENGINE_TYPE.LLM, name)
    return engine.parameters()