# -*- coding: utf-8 -*-
'''
@File    :   dialogueAgnet.py
@Author  :   一力辉 
'''

from ..builder import AGENTS
from ..agentBase import BaseAgent
import json
import httpx
import requests
from typing import List, Optional, Union
from digitalHuman.utils import logger
from digitalHuman.utils import AudioMessage, TextMessage
from digitalHuman.engine.engineBase import BaseEngine
import re

__all__ = ["FastgptAgent"]


@AGENTS.register("FastgptAgent")
class FastgptAgent(BaseAgent):

    def checkKeys(self) -> List[str]:
        return []
    
    def setup(self):
        pass

    async def run(
        self, 
        input: Union[TextMessage, AudioMessage], 
        streaming: bool,
        url: str,
        key: str,
        **kwargs
    ):
        try:
            if isinstance(input, AudioMessage):
                raise RuntimeError("RepeaterAgent does not support AudioMessage input")
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {key}'
            }
            responseMode = "streaming" if streaming else "blocking"
            payload = {
                "stream": True,
                "detail": False,
                "messages":[
                    {"role": "user",
                     "content": input.data,
                     "id": 1
                     }
                ]
            }
            pattern = re.compile(r'data:\s*({.*})')
            client = httpx.AsyncClient(headers=headers,timeout=20.0)
            if streaming:
                async with client.stream('POST', url + "/v1/chat/completions", headers=headers, json=payload) as response:
                    async for chunk in response.aiter_bytes():
                        # 避免返回多条
                        chunkStr = chunk.decode('utf-8').strip()
                        # 过滤非data信息
                        if not chunkStr.startswith("data:"): continue
                        chunkData = pattern.search(chunkStr)
                        chunkData = chunkData.group(1)

                        try:
                            # dify将过长的回复信息直接截断了
                            if not chunkData.endswith("}"):
                                logger.warning(f"[AGENT] Engine return truncated data: {chunkData}")
                                continue
                            data = json.loads(chunkData)
                            # 处理流式返回字符串
                            if 'choices' in data:
                                if data["choices"][0]['finish_reason'] == "stop":
                                    break
                                else:
                                    yield bytes(data["choices"][0]["delta"]["content"], encoding='utf-8')
                        except Exception as e:
                            logger.error(f"[AGENT] Engine run failed: {e}")
                            yield bytes("内部错误，请检查fastgpt信息。", encoding='utf-8')

            else:
                response = await client.post(url + "/v1/chat/completions", headers=headers, json=payload)
                data = json.loads(response.text)
                yield bytes(data['choices'], encoding='utf-8')
        except Exception as e:
            logger.error(f"[AGENT] Engine run failed: {e}")
            yield bytes("内部错误，请检查fastgpt信息。", encoding='utf-8')