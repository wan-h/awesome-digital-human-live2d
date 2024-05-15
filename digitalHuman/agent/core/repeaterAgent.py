# -*- coding: utf-8 -*-
'''
@File    :   dialogueAgnet.py
@Author  :   一力辉 
'''

from ..builder import AGENTS
from ..agentBase import BaseAgent
from .characterManager import CharacterVoiceManager
from typing import List, Optional, Union
from digitalHuman.utils import logger
from digitalHuman.utils import AudioMessage, TextMessage
from digitalHuman.engine.engineBase import BaseEngine

__all__ = ["Repeater"]


@AGENTS.register("Repeater")
class Repeater(BaseAgent):

    def checkKeys(self) -> List[str]:
        return []
    
    async def run(
        self, input: Union[TextMessage, AudioMessage], 
        asrEngine: Optional[BaseEngine] = None,
        llmEngine: Optional[BaseEngine] = None,
        ttsEngine: Optional[BaseEngine] = None, 
        character: str = "",
        **kwargs
    ) -> Optional[TextMessage]:
        try: 
            if isinstance(input, AudioMessage):
                asrResult: TextMessage = await asrEngine.run(input)
            else:
                asrResult: TextMessage = input
            voice = CharacterVoiceManager.getVoice(character) if character else None
            ttsResult: AudioMessage = await ttsEngine.run(asrResult, voice=voice)
            return ttsResult
        except Exception as e:
            logger.error(f"[AGENT] Engine run failed: {e}")
            return None