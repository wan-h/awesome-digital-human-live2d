# -*- coding: utf-8 -*-
'''
@File    :   asr_api_v0_impl.py
@Author  :   一力辉
'''


from typing import List
from digitalHuman.engine import EnginePool
from digitalHuman.utils import config
from digitalHuman.protocol import ParamDesc, EngineDesc, ENGINE_TYPE, UserDesc, AudioMessage, TextMessage
from digitalHuman.server.models import ASREngineInput

enginePool = EnginePool()

def get_asr_list() -> List[EngineDesc]:
    engines = enginePool.listEngine(ENGINE_TYPE.ASR)
    return [enginePool.getEngine(ENGINE_TYPE.ASR, engine).desc() for engine in engines]

def get_asr_default() -> EngineDesc:
    return enginePool.getEngine(ENGINE_TYPE.ASR, config.SERVER.ENGINES.ASR.DEFAULT).desc()

def get_asr_param(name: str) -> List[ParamDesc]:
    engine = enginePool.getEngine(ENGINE_TYPE.ASR, name)
    return engine.parameters()

async def asr_infer(user: UserDesc, items: ASREngineInput) -> TextMessage:
    if items.engine.lower() == "default":
        items.engine = config.SERVER.ENGINES.ASR.DEFAULT
    input = AudioMessage(data=items.data, sampleRate=items.sampleRate, sampleWidth=items.sampleWidth, type=items.type)
    engine = enginePool.getEngine(ENGINE_TYPE.ASR, items.engine)
    output: TextMessage = await engine.run(input=input, user=user, **items.config)
    return output