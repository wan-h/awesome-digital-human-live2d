# -*- coding: utf-8 -*-
'''
@File    :   app.py
@Author  :   一力辉 
'''

import uvicorn
from digitalHuman.engine import EnginePool
from digitalHuman.agent import AgentPool
from digitalHuman.server import app
from digitalHuman.utils import config

__all__ = ["runServer"]

def runServer():
    enginePool = EnginePool()
    enginePool.setup(config.SERVER.ENGINES)
    agentPool = AgentPool()
    agentPool.setup(config.SERVER.AGENTS)
    uvicorn.run(app, host=config.SERVER.IP, port=config.SERVER.PORT, log_level="info")