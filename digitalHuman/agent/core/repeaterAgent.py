# -*- coding: utf-8 -*-
'''
@File    :   dialogueAgnet.py
@Author  :   一力辉 
'''

from ..builder import AGENTS
from ..agentBase import BaseAgent
from typing import List, Optional, Union
from digitalHuman.utils import logger
from digitalHuman.utils import AudioMessage, TextMessage
from digitalHuman.engine.engineBase import BaseEngine

__all__ = ["Repeater"]


@AGENTS.register("RepeaterAgent")
class RepeaterAgent(BaseAgent):

    def checkKeys(self) -> List[str]:
        return []
    
    async def run(
        self, 
        input: Union[TextMessage, AudioMessage], 
        streaming: False,
        **kwargs
    ):
        try: 
            if isinstance(input, AudioMessage):
                raise RuntimeError("RepeaterAgent does not support AudioMessage input")
            yield bytes(input.data, encoding='utf-8')
        except Exception as e:
            logger.error(f"[AGENT] Engine run failed: {e}", exc_info=True)
            yield bytes("", encoding='utf-8')