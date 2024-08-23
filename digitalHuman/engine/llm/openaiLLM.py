# -*- coding: utf-8 -*-
'''
@File    :   openaiLLM.py
@Author  :   一力辉 
'''

from ..builder import LLMEngines
from ..engineBase import BaseEngine
import json
from typing import List, Optional
from digitalHuman.utils import httpxAsyncClient
from digitalHuman.utils import TextMessage
from digitalHuman.utils import logger

__all__ = ["OpenaiAPI"]

@LLMEngines.register("OpenaiAPI")
class OpenaiAPI(BaseEngine): 
    def checkKeys(self) -> List[str]:
        return ["SK", "MODEL", "LLM_URL"]
        
    
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
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.cfg.SK}'
            }
            resp = await httpxAsyncClient.post(self.cfg.LLM_URL, headers=headers, content=payload, timeout=60)
            result = resp.json()["choices"][0]["message"]["content"]
            message = TextMessage(data=result)
            return message
        except Exception as e:
            logger.error(f"[LLM] Engine run failed: {e}", exc_info=True)
            return None