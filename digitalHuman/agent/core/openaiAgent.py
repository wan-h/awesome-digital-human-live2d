# -*- coding: utf-8 -*-
'''
@File    :   openaiAgnet.py
@Author  :   一力辉 
'''

from ..builder import AGENTS
from ..agentBase import BaseAgent
import re
import json
from typing import List, Union
from digitalHuman.utils import httpxAsyncClient
from digitalHuman.utils import logger
from digitalHuman.utils import AudioMessage, TextMessage

__all__ = ["OpenaiAgent"]

CHAT_ROUTE = "/chat/completions"

@AGENTS.register("OpenaiAgent")
class OpenaiAgent(BaseAgent):
    async def run(
        self, 
        input: Union[TextMessage, AudioMessage], 
        streaming: bool,
        **kwargs
    ):
        try:
            if isinstance(input, AudioMessage):
                raise RuntimeError("DifyAgent does not support AudioMessage input yet")
            # 参数校验
            for paramter in self.parameters():
                if paramter['NAME'] not in kwargs:
                    raise RuntimeError(f"Missing parameter: {paramter['NAME']}")
            API_URL = kwargs["OPENAI_BASE_URL"]
            API_KEY = kwargs["OPENAI_API_KEY"]
            API_MODEL = kwargs["OPENAI_API_MODEL"]

            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {API_KEY}'
            }

            payload = {
                "model": API_MODEL,
                "messages": [
                    {
                        "role": "user",
                        "content": input.data
                    }
                ],
                "stream": streaming
            }

            pattern = re.compile(r'data:\s*({.*})')
            if streaming:
                async with httpxAsyncClient.stream('POST', API_URL + CHAT_ROUTE, headers=headers, json=payload) as response:
                    if response.status_code != 200:
                        raise RuntimeError(f"status_code: {response.status_code}")
                    async for chunk in response.aiter_lines():
                        chunkStr = chunk.strip()
                        if not chunkStr: continue
                        chunkData = pattern.search(chunkStr)
                        if not chunkStr.endswith('}') or not chunkData:
                            logger.warning(f"[AGENT] Engine return mismatch pattern data: {chunkStr}")
                            continue
                        chunkData = chunkData.group(1)

                        try:
                            data = json.loads(chunkData)
                            # 处理流式返回字符串
                            if "choices" in data and len(data["choices"]) > 0:
                                if 'delta' in data["choices"][0] and 'content' in data["choices"][0]['delta']:
                                    logger.debug(f"[AGENT] Engine response: {data}")
                                    yield data["choices"][0]['delta']['content']
                        except Exception as e:
                            logger.error(f"[AGENT] Engine run failed: {e}", exc_info=True)
                            yield "内部错误，请检查openai信息。"

            else:
                response = await httpxAsyncClient.post(API_URL + CHAT_ROUTE, headers=headers, json=payload)
                data = response.json()["choices"][0]["message"]["content"]
                yield data
        except Exception as e:
            logger.error(f"[AGENT] Engine run failed: {e}", exc_info=True)
            yield "openai接口请求返回错误。"