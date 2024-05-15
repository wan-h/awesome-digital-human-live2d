# -*- coding: utf-8 -*-
'''
@File    :   openaiLLM.py
@Author  :   一力辉 
'''

from ..builder import LLMEngines
from ..engineBase import BaseEngine
import json
import httpx
from typing import List, Optional
from digitalHuman.utils import TextMessage
from digitalHuman.utils import logger

__all__ = ["OpenaiAPI"]

@LLMEngines.register("OpenaiAPI")
class OpenaiAPI(BaseEngine): 
    def checkKeys(self) -> List[str]:
        return ["SK", "MODEL", "LLM_URL"]
    
    def setup(self):
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.cfg.SK}'
        }
        self.client = httpx.AsyncClient(headers=headers)
    
    async def run(self, input: TextMessage, **kwargs) -> Optional[TextMessage]:
        try: 
            payload = json.dumps({
                "model": self.cfg.MODEL,
                "messages": [
                    {
                        "role": "user",
                        "content": input.data
                    }
                ],
            })
            resp = await self.client.post(self.cfg.LLM_URL, content=payload, timeout=60)
            result = resp.json()["choices"][0]["message"]["content"]
            message = TextMessage(data=result)
            return message
        except Exception as e:
            logger.error(f"[LLM] Engine run failed: {e}")
            return None