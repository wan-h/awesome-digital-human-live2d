# -*- coding: utf-8 -*-
'''
@File    :   repeaterAgnet.py
@Author  :   一力辉 
'''

from ..builder import AGENTS
from ..agentBase import BaseAgent
from digitalHuman.protocol import *

__all__ = ["Repeater"]


@AGENTS.register("Repeater")
class RepeaterAgent(BaseAgent):
    async def run(
        self, 
        input: TextMessage, 
        **kwargs
    ):
        yield eventStreamText(input.data)
        yield eventStreamDone()