# -*- coding: utf-8 -*-
'''
@File    :   fastgptAgnet.py
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
                    if response.status_code != 200:
                        raise RuntimeError(f"status_code: {response.status_code}")
                    async for chunk in response.aiter_lines():
                        chunkStr = chunk.strip()
                        if not chunkStr: continue
                        # 过滤非data信息
                        if not chunkStr.startswith("data:"): continue

                        # 使用正则表达式找到所有的data:后的内容  
                        matches = re.findall(r'data: (.*?)(?=\ndata: |$)', chunkStr, re.DOTALL) 
                        for match in matches:
                            try:
                                if match != '[DONE]':
                                    data = json.loads(match)
                                    if 'choices' in data:
                                        if data["choices"][0]['finish_reason'] == "stop":
                                            break
                                        else:
                                            logger.debug(f"[AGENT] Engine response: {data['choices'][0]['delta']['content']}")
                                            yield data["choices"][0]["delta"]["content"]
                            except Exception as e:
                                logger.error(f"[AGENT] Engine run failed: {e}")
                                yield "内部错误，请检查fastgpt信息。"


            else:
                response = await httpxAsyncClient.post(API_URL + "/v1/chat/completions", headers=headers, json=payload)
                data = json.loads(response.text)
                yield data['choices']
        except Exception as e:
            logger.error(f"[AGENT] Engine run failed: {e}", exc_info=True)
            yield "fastgpt接口请求返回错误。"