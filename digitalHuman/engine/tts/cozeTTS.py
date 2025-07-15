# -*- coding: utf-8 -*-
'''
@File    :   difyTTS.py
@Author  :   一力辉
'''


from ..builder import TTSEngines
from ..engineBase import BaseTTSEngine
import base64
from digitalHuman.protocol import *
from digitalHuman.utils import logger, httpxAsyncClient, checkResponse

__all__ = ["CozeApiTts"]


@TTSEngines.register("Coze")
class CozeApiTts(BaseTTSEngine):
    def setup(self):
        self.url = "https://api.coze.cn/v1/audio/speech"
        # TODO: 多人请求差异化
        # self.voicesMap = {}

    # async def voices(self, **kwargs) -> List[VoiceDesc]:
    #     # 参数校验
    #     paramters = self.checkParameter(**kwargs)
    #     API_TOKEN = paramters["token"]
    #     if not API_TOKEN: return []
    #     headers = {
    #         'Authorization': f'Bearer {API_TOKEN}',
    #         'Content-Type': 'application/json'
    #     }
    #     resp = []
    #     page_num = 1
    #     page_size = 100
    #     while True:
    #         payload = {
    #             "page_num": page_num,
    #             "page_size": page_size
    #         }
    #         response = await httpxAsyncClient.get("https://api.coze.cn/v1/audio/voices", headers=headers, params=payload)
    #         result = checkResponse(response, "CozeApiTts", "get voice list")
    #         has_more = result['data']['has_more']
    #         voices = result['data']['voice_list']
    #         self.voicesMap.update((voice['name'], voice['voice_id']) for voice in voices)
    #         for voice in voices:
    #             resp.append(VoiceDesc(
    #                 name=voice['name'],
    #                 gender=GENDER_TYPE.FEMALE if 'female' in voice['speaker_id'] else GENDER_TYPE.MALE,
    #             ))
    #         if has_more:
    #             page_num += 1
    #         else:
    #             break
    #     return resp

    async def run(self, input: TextMessage, **kwargs) -> AudioMessage:
        # 参数校验
        paramters = self.checkParameter(**kwargs)
        token = paramters["token"]
        bot_id = paramters["bot_id"]

        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

        # 获取智能体配置信息
        response = await httpxAsyncClient.get(f"https://api.coze.cn/v1/bots/{bot_id}", headers=headers)
        resp = checkResponse(response, "CozeApiTts", "get bot info")
        voice_id = resp['data']['voice_info_list'][0]['voice_id']

        payload = {
            'input': input.data,
            'voice_id': voice_id,
            'speed': 1.0,
            'response_format': 'mp3',
            'sample_rate': 16000,
        }

        logger.debug(f"[TTS] Engine input: {input.data}")
        response = await httpxAsyncClient.post(self.url, json=payload, headers=headers)
        if response.status_code != 200:
            raise RuntimeError(f"CozeAPI tts api error: {response.text}")

        message = AudioMessage(
            data=base64.b64encode(response.content).decode('utf-8'),
            sampleRate=16000,
            sampleWidth=2,
        )
        return message