# -*- coding: utf-8 -*-
'''
@File    :   edgeTTS.py
@Author  :   一力辉 
'''

from ..builder import TTSEngines
from ..engineBase import BaseEngine
import edge_tts
from io import BytesIO
from typing import List, Optional
from pydub import AudioSegment
from digitalHuman.utils import logger
from digitalHuman.utils import TextMessage, AudioMessage, AudioFormatType

__all__ = ["EdgeAPI"]

def mp3ToWav(mp3Bytes: bytes) -> bytes:
    mp3Data = BytesIO(mp3Bytes)
    audio = AudioSegment.from_mp3(mp3Data)
    wavData = BytesIO()
    audio.export(wavData, format="wav")
    wavBytes = wavData.getvalue()
    return wavBytes

@TTSEngines.register("EdgeAPI")
class EdgeAPI(BaseEngine):
    def checkKeys(self) -> List[str]:
        return ["PER", "RATE", "VOL", "PIT"]
    
    async def run(self, input: TextMessage, **kwargs) -> Optional[TextMessage]:
        try: 
            voice = self.cfg.PER
            if 'voice' in kwargs and kwargs['voice']:
                voice = kwargs['voice']
            communicate = edge_tts.Communicate(
                text=input.data, 
                voice=voice,
                rate=self.cfg.RATE,
                volume=self.cfg.VOL,
                pitch=self.cfg.PIT
            )
            data = b''
            async for message in communicate.stream():
                if message["type"] == "audio":
                    data += message["data"]
            # mp3 -> wav
            data = mp3ToWav(data)
            message = AudioMessage(
                data=data, 
                desc=input.data,
                format=AudioFormatType.WAV,
                sampleRate=16000,
                sampleWidth=2,
            )
            return message
        except Exception as e:
            logger.error(f"[TTS] Engine run failed: {e}")
            return None