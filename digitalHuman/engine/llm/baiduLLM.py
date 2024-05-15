# -*- coding: utf-8 -*-
'''
@File    :   qianfanLLM.py
@Author  :   一力辉 
'''

"""
API文档:
https://cloud.baidu.com/doc/WENXINWORKSHOP/s/flfmc9do2
"""

from ..builder import LLMEngines
from ..engineBase import BaseEngine
import json
import httpx
import requests
from typing import List, Optional, Union
from digitalHuman.utils import TextMessage
from digitalHuman.utils import logger

__all__ = ["BaiduAPI"]

@LLMEngines.register("BaiduAPI")
class BaiduAPI(BaseEngine): 
    def checkKeys(self) -> List[str]:
        return ["AK", "SK", "MODEL"]
    
    def setup(self):
        params = {
            'grant_type': 'client_credentials',
            'client_id': self.cfg.AK,
            'client_secret': self.cfg.SK
        }
        try:
            response = requests.post(self.cfg.TOKEN_URL, data=params)
            result = response.json()
            self.token = result.get("access_token")
        except Exception as e:
            self.token = None
            raise RuntimeError(f"[ASR] Engine get token failed: {e}") 
        headers = {'Content-Type': 'application/json'}
        self.client = httpx.AsyncClient(headers=headers)
    
    async def run(self, input: Union[TextMessage, List[TextMessage]], **kwargs) -> Optional[TextMessage]:
        try: 
            if isinstance(input, list):
                messages = [
                    {
                        "role": inp.desc,
                        "content": inp.data
                    }
                    for inp in input
                ]
            else:
                messages = [
                    {
                        "role": "user",
                        "content": input.data
                    }
                ]
            payload = json.dumps({
                "messages": messages,
                "temperature": 0.8,
                "disable_search": False,
                "enable_citation": False
            })
            resp = await self.client.post(self.cfg.LLM_URL + self.cfg.MODEL, content=payload, params={'access_token': self.token}, timeout=60)
            result = resp.json()["result"]
            message = TextMessage(data=result)
            return message
        except Exception as e:
            logger.error(f"[LLM] Engine run failed: {e}")
            return None