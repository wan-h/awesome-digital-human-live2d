# -*- coding: utf-8 -*-
'''
@File    :   agent_api_v0_impl.py
@Author  :   一力辉
'''


from typing import List, Dict
from digitalHuman.agent import AgentPool
from digitalHuman.utils import config
from digitalHuman.protocol import *
from digitalHuman.server.models import AgentEngineInput

agentPool = AgentPool()

def get_agent_list() -> List[EngineDesc]:
    agents = agentPool.list()
    return [agentPool.get(agent).desc() for agent in agents]

def get_agent_default() -> EngineDesc:
    return agentPool.get(config.SERVER.AGENTS.DEFAULT).desc()

def get_agent_param(name: str) -> List[ParamDesc]:
    engine = agentPool.get(name)
    return engine.parameters()

async def create_agent_conversation(name: str, param: Dict) -> str:
    engine = agentPool.get(name)
    id = await engine.createConversation(**param)
    return id

def agent_infer_stream(user: UserDesc, items: AgentEngineInput):
    input = TextMessage(data=items.data)
    streamContent = agentPool.get(items.engine).run(input=input, user=user, streaming=True, conversation_id=items.conversation_id, **items.config)
    return streamContent