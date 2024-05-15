# -*- coding: utf-8 -*-
'''
@File    :   googleASR.py
@Author  :   一力辉 
'''

from ..builder import ASREngines
from ..engineBase import BaseEngine
from typing import List, Optional
import speech_recognition as sr
from speech_recognition import AudioData
from digitalHuman.utils import AudioMessage, TextMessage
from digitalHuman.utils import logger

__all__ = ["GoogleAPI"]

@ASREngines.register("GoogleAPI")
class GoogleAPI(BaseEngine): 
    def checkKeys(self) -> List[str]:
        return ["KEY", "LANGUAGE"]
    
    def setup(self):
        self.rec = sr.Recognizer()
    
    async def run(self, input: AudioMessage, **kwargs) -> Optional[AudioMessage]:
        try: 
            key = self.cfg.KEY if self.cfg.KEY else None
            audio = AudioData(
                input.data,
                input.sampleRate,
                input.sampleWidth
            )
            result = str(self.rec.recognize_google(audio, key=key, language=self.cfg.LANGUAGE))
            message = TextMessage(data=result)
            return message
        except Exception as e:
            logger.error(f"[ASR] Engine run failed: {e}")
            return None