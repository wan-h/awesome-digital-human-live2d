# -*- coding: utf-8 -*-
'''
@File    :   fastgptAgnet.py
@Author  :   一力辉 
'''

from ..builder import AGENTS
from ..agentBase import BaseAgent
import re
import json
from digitalHuman.protocol import *
from digitalHuman.utils import httpxAsyncClient, logger, resonableStreamingParser


__all__ = ["FastgptApiAgent"]


@AGENTS.register("FastGPT")
class FastgptApiAgent(BaseAgent):
    async def run(
        self, 
        input: TextMessage, 
        streaming: bool,
        **kwargs
    ):
        try:
            if not streaming:
                raise KeyError("FastGPT Agent only supports streaming mode")

            # 参数校验
            paramters = self.checkParameter(**kwargs)
            base_url = paramters["base_url"]
            api_key = paramters["api_key"]
            uid = paramters["uid"]
            conversation_id = paramters["conversation_id"] if "conversation_id" in paramters else ""

            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}'
            }
            payload = {
                "chatId": conversation_id,
                "stream": streaming,
                "detail": False,
                "messages":[
                    {
                        "role": "user",
                        "content": input.data,
                    }
                ],
                "customUid": uid
            }
            pattern = re.compile(r'data:\s*({.*})')
            coversaiotnIdRequire = False if conversation_id else True
            if coversaiotnIdRequire:
                conversation_id = await self.createConversation()
                yield eventStreamConversationId(conversation_id)
            async with httpxAsyncClient.stream('POST', base_url + "/v1/chat/completions", headers=headers, json=payload) as response:
                async def generator():
                    async for chunk in response.aiter_lines():
                        chunkStr = chunk.strip()
                        if not chunkStr: continue
                        chunkData = pattern.search(chunkStr)
                        if not chunkStr.endswith('}') or not chunkData: 
                            if 'DONE' in chunkStr: break
                            logger.warning(f"[AGENT] Engine return truncated data: {chunkStr}")
                            continue
                        chunkData = chunkData.group(1)

                        data = json.loads(chunkData)
                        # 处理流式返回字符串
                        if len(data["choices"]) > 0:
                            logger.debug(f"[AGENT] Engine response: {data}")
                            content = data["choices"][0]['delta']['content']
                            if content:
                                yield (EVENT_TYPE.TEXT, content)
                async for parseResult in resonableStreamingParser(generator()):
                    yield parseResult
            yield eventStreamDone()
        except Exception as e:
            logger.error(f"[FastgptApiAgent] Exception: {e}", exc_info=True)
            yield eventStreamError(str(e))