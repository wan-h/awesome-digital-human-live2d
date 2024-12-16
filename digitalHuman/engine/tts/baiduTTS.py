# -*- coding: utf-8 -*-
'''
@File    :   baiduTTS.py
@Author  :   一力辉 
'''

"""
API文档:
https://cloud.baidu.com/doc/SPEECH/s/mlciskuqn
"""

from ..builder import TTSEngines
from ..engineBase import BaseEngine
import time
import json
import httpx
from typing import List, Optional
from digitalHuman.utils import logger
from digitalHuman.utils import httpxAsyncClient
from digitalHuman.utils import TextMessage, AudioMessage, AudioFormatType

__all__ = ["BaiduAPI"]

CUID = 'AWESOME-DIGITAL-HUMAN'
FORMATS = {3: AudioFormatType.MP3, 6: AudioFormatType.WAV}

@TTSEngines.register("BaiduAPI")
class BaiduAPI(BaseEngine):
    def checkKeys(self) -> List[str]:
        return [
            "TOKEN_URL", "TTS_SHORT_URL", "TTS_LONG_CREATE_URL", "TTS_LONG_QUERY_URL", "LENGTH_THRESHOLD", 
            "PER", "SPD", "PIT", "VOL", "AUE", "LAN", "AK", "SK"
        ]

    def setup(self):
        params = {
            'grant_type': 'client_credentials',
            'client_id': self.cfg.AK,
            'client_secret': self.cfg.SK
        }
        try:
            response = httpx.post(self.cfg.TOKEN_URL, data=params)
            result = response.json()
            self.token = result.get("access_token")
        except Exception as e:
            self.token = None
            raise RuntimeError(f"[ASR] Engine get token failed: {e}")
    
    async def runShort(self, input: TextMessage) -> Optional[AudioMessage]:
        params = {
            'tok': self.token, 
            'tex': input.data, 
            'per': self.cfg.PER, 
            'spd': self.cfg.SPD, 
            'pit': self.cfg.PIT, 
            'vol': self.cfg.VOL, 
            'aue': self.cfg.AUE, 
            'cuid': CUID,
            'lan': self.cfg.LAN, 
            'ctp': 1
        }

        resp = await httpxAsyncClient.post(self.cfg.TTS_SHORT_URL, params=params)
        if resp.status_code != 200:
                raise RuntimeError(f"status_code: {resp.status_code}")
        
        message = AudioMessage(
            data=resp.content,
            desc=input.data,
            format=FORMATS[self.cfg.AUE],
            sampleRate=16000,
            sampleWidth=2,
        )
        return message

    async def runLong(self, input: TextMessage) -> Optional[AudioMessage]:
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        # create task
        params = {"access_token": self.token}
        payload = json.dumps({
            "text": input.data,
            "format": FORMATS[self.cfg.AUE],
            "voice": self.cfg.PER,
            "lang": self.cfg.LAN,
            "speed": self.cfg.SPD,
            "pitch": self.cfg.PIT,
            "volume": self.cfg.VOL,
            "enable_subtitle": 0
        })

        resp = await httpxAsyncClient.post(self.cfg.TTS_LONG_CREATE_URL, headers=headers, content=payload, params=params)
        if resp.status_code != 200:
                raise RuntimeError(f"status_code: {resp.status_code}")
        taskId = resp.json()['task_id']
        
        # query task
        payload = json.dumps({
            "task_ids": [taskId]
        })
        taskStatus = "Running"
        while taskStatus == "Running":
            resp = await httpxAsyncClient.post(self.cfg.TTS_LONG_QUERY_URL, headers=headers, content=payload, params=params)
            if resp.status_code != 200:
                raise RuntimeError(f"status_code: {resp.status_code}")
            taskStatus = resp.json()['tasks_info'][0]['task_status']
            time.sleep(0.2)
        if taskStatus != "Success":
            raise Exception(f"[TTS] taskStatus: {taskStatus}")
        
        # download audio
        speechUrl = resp.json()['tasks_info'][0]['task_result']['speech_url']
        resp = await httpxAsyncClient.get(speechUrl)
        message = AudioMessage(
            data=resp.content,
            desc=input.data,
            format=FORMATS[self.cfg.AUE],
            sampleRate=16000,
            sampleWidth=2,
        )
        return message

    
    async def run(self, input: TextMessage, **kwargs) -> Optional[TextMessage]:
        try: 
            if len(input.data) > self.cfg.LENGTH_THRESHOLD:
                logger.debug("[TTS] run long input tts")
                message = await self.runLong(input)
            else:
                logger.debug("[TTS] run short input tts")
                message = await self.runShort(input)
            return message
        except Exception as e:
            logger.error(f"[TTS] Engine run failed: {e}", exc_info=True)
            return None