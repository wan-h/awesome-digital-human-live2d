# -*- coding: utf-8 -*-
'''
@File    :   voiceManager.py
@Author  :   一力辉 
'''

from typing import Optional
from digitalHuman.utils import logger

class CharacterVoiceManager():
    voiceMap = {
        "Kei": "zh-CN-XiaoxiaoNeural",
        "Haru": "zh-CN-XiaoyiNeural"
    }

    @classmethod
    def getVoice(cls, character: str) -> Optional[str]:
        if character in cls.voiceMap:
            return cls.voiceMap[character]
        logger.error(f"[CharacterVoiceManager] Voice not support character: {character}")
        return None