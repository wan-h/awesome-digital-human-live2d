# -*- coding: utf-8 -*-
'''
@File    :   difyASR.py
@Author  :   一力辉
'''


from ..builder import ASREngines
from ..engineBase import BaseASREngine
import io, base64
from digitalHuman.protocol import AudioMessage, TextMessage, AUDIO_TYPE
from digitalHuman.utils import logger, httpxAsyncClient, wavToMp3, checkResponse

__all__ = ["CozeApiAsr"]


@ASREngines.register("Coze")
class CozeApiAsr(BaseASREngine): 
    def setup(self):
        self.url = "https://api.coze.cn/v1/audio/transcriptions"

    async def run(self, input: AudioMessage, **kwargs) -> TextMessage:
        # 参数校验
        paramters = self.checkParameter(**kwargs)
        API_TOKEN = paramters["token"]

        headers = {
            'Authorization': f'Bearer {API_TOKEN}'
        }

        files = {
            'file': ('adh.mp3', input.data)
        }

        if isinstance(input.data, str):
            input.data = base64.b64decode(input.data)
        if input.type == AUDIO_TYPE.WAV:
            input.data = wavToMp3(input.data)
            input.type = AUDIO_TYPE.MP3

        response = await httpxAsyncClient.post(self.url, headers=headers, files=files)
        resp = checkResponse(response, "CozeApiAsr")
        result = resp["data"]["text"]
        logger.debug(f"[ASR] Engine response: {result}")
        message = TextMessage(data=result)
        return message