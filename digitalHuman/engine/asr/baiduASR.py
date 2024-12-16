# -*- coding: utf-8 -*-
'''
@File    :   baiduASR.py
@Author  :   一力辉 
'''

"""
API文档:
https://cloud.baidu.com/doc/SPEECH/s/qlcirqhz0
"""

from ..builder import ASREngines
from ..engineBase import BaseEngine
import httpx
from typing import List, Optional
from digitalHuman.utils import httpxAsyncClient
from digitalHuman.utils import AudioMessage, TextMessage
from digitalHuman.utils import logger

__all__ = ["BaiduAPI"]

# TOKEN_URL = 'http://aip.baidubce.com/oauth/2.0/token'
CUID = 'AWESOME-DIGITAL-HUMAN'
# 极速版
# DEV_PID = 80001
# ASR_URL = 'http://vop.baidu.com/pro_api'
# 普通版
# DEV_PID = 1537;  # 1537 表示识别普通话，使用输入法模型。根据文档填写PID，选择语言及识别模型
# ASR_URL = 'http://vop.baidu.com/server_api'

@ASREngines.register("BaiduAPI")
class BaiduAPI(BaseEngine): 
    def checkKeys(self) -> List[str]:
        return ["AK", "SK", "TOKEN_URL", "ASR_URL", "DEV_PID"]
    
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
    
    async def run(self, input: AudioMessage, **kwargs) -> Optional[TextMessage]:
        try: 
            params = {'cuid': CUID, 'token': self.token, 'dev_pid': self.cfg.DEV_PID}
            headers = {
                'Content-Type': 'audio/' + str(input.format) + '; rate=' + str(input.sampleRate),
                'Content-Length': str(len(input.data))
            }
            resp = await httpxAsyncClient.post(self.cfg.ASR_URL, content=input.data, params=params, headers=headers)
            if resp.status_code != 200:
                raise RuntimeError(f"status_code: {resp.status_code}")
            logger.debug(f"[ASR] Engine response: {resp.json()}")
            result = resp.json()["result"][0]
            message = TextMessage(data=result)
            return message
        except Exception as e:
            logger.error(f"[ASR] Engine run failed: {e}", exc_info=True)
            return None