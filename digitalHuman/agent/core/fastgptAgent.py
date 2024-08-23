# -*- coding: utf-8 -*-
'''
@File    :   dialogueAgnet.py
@Author  :   一力辉 
'''

from ..builder import AGENTS
from ..agentBase import BaseAgent
import re
import json
from typing import List, Optional, Union
from digitalHuman.utils import httpxAsyncClient
from digitalHuman.utils import logger
from digitalHuman.utils import AudioMessage, TextMessage

__all__ = ["FastgptAgent"]


@AGENTS.register("FastgptAgent")
class FastgptAgent(BaseAgent):

    def checkKeys(self) -> List[str]:
        return []

    async def run(
        self, 
        input: Union[TextMessage, AudioMessage], 
        streaming: bool,
        **kwargs
    ):
        try:
            if isinstance(input, AudioMessage):
                raise RuntimeError("FastgptAgent does not support AudioMessage input yet")
            # 参数校验
            for paramter in self.parameters():
                if paramter['NAME'] not in kwargs:
                    raise RuntimeError(f"Missing parameter: {paramter['NAME']}")
            API_URL = kwargs["FASTGPT_API_URL"]
            API_KEY = kwargs["FASTGPT_API_KEY"]
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {API_KEY}'
            }

            payload = {
                "stream": streaming,
                "detail": False,
                "messages":[
                    {
                        "role": "user",
                        "content": input.data,
                    }
                ]
            }
            pattern = re.compile(r'data:\s*({.*})')
            if streaming:
                async with httpxAsyncClient.stream('POST', API_URL + "/v1/chat/completions", headers=headers, json=payload) as response:
                    async for chunk in response.aiter_bytes():
                        # 避免返回多条
                        chunkStrs = chunk.decode('utf-8').strip()
                        for chunkStr in chunkStrs.split('\n'):
                            # 过滤非data信息
                            if not chunkStr.startswith("data:"): continue
                            chunkData = pattern.search(chunkStr)
                            # 将过长的回复信息直接截断了
                            if not chunkStr.endswith('}') or not chunkData:
                                logger.warning(f"[AGENT] Engine return truncated data: {chunkData}")
                                continue
                            chunkData = chunkData.group(1)

                            try:
                                data = json.loads(chunkData)
                                # 处理流式返回字符串
                                if 'choices' in data:
                                    if data["choices"][0]['finish_reason'] == "stop":
                                        break
                                    else:
                                        logger.debug(f"[AGENT] Engine response: {data['choices'][0]['delta']['content']}")
                                        yield bytes(data["choices"][0]["delta"]["content"], encoding='utf-8')
                            except Exception as e:
                                logger.error(f"[AGENT] Engine run failed: {e}")
                                yield bytes("内部错误，请检查fastgpt信息。", encoding='utf-8')

            else:
                response = await httpxAsyncClient.post(API_URL + "/v1/chat/completions", headers=headers, json=payload)
                data = json.loads(response.text)
                yield bytes(data['choices'], encoding='utf-8')
        except Exception as e:
            logger.error(f"[AGENT] Engine run failed: {e}")
            yield bytes("fastgpt接口请求返回错误。", encoding='utf-8')