# -*- coding: utf-8 -*-
'''
@File    :   difyTTS.py
@Author  :   一力辉
'''


from ..builder import TTSEngines
from ..engineBase import BaseTTSEngine
import base64
from digitalHuman.protocol import *
from digitalHuman.utils import logger, httpxAsyncClient, mp3ToWav

__all__ = ["DifyApiTts"]


@TTSEngines.register("Dify")
class DifyApiTts(BaseTTSEngine):
    async def run(self, input: TextMessage, **kwargs) -> AudioMessage:
        # 参数校验
        paramters = self.checkParameter(**kwargs)
        API_SERVER = paramters["api_server"]
        API_KEY = paramters["api_key"]
        API_USERNAME = paramters["username"]


        headers = {
            'Authorization': f'Bearer {API_KEY}'
        }
        payload = {
            "text": input.data,
            "user": API_USERNAME,
        }

        logger.debug(f"[TTS] Engine input: {input.data}")
        response = await httpxAsyncClient.post(API_SERVER + "/text-to-audio", json=payload, headers=headers)
        if response.status_code != 200:
            raise RuntimeError(f"DifyAPI tts api error: {response.status_code}")

        # TODO：这里Dify只能使用同步接口，主动释放异步事件
        # await asyncio.sleep(0)
        # resp = httpx.post(API_URL + "/text-to-audio", json=payload, headers=headers)
        # await asyncio.sleep(0)
        message = AudioMessage(
            # data=base64.b64encode(mp3ToWav(response.content)).decode('utf-8'),
            data=base64.b64encode(response.content.decode('utf-8')),
            sampleRate=16000,
            sampleWidth=2,
        )
        return message