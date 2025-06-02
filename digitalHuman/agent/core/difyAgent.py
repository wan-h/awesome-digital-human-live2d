# -*- coding: utf-8 -*-
'''
@File    :   difyAgnet.py
@Author  :   一力辉 
'''

from ..builder import AGENTS
from ..agentBase import BaseAgent
import re
import json
from digitalHuman.protocol import *
from digitalHuman.utils import httpxAsyncClient, logger, resonableStreamingParser

__all__ = ["DifyApiAgent"]


@AGENTS.register("Dify")
class DifyApiAgent(BaseAgent):
    async def createConversation(self, **kwargs) -> str:
        # 参数校验
        paramters = self.checkParameter(**kwargs)
        api_server = paramters["api_server"]
        api_key = paramters["api_key"]
        username = paramters["username"]

        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}'
        }
        payload = {
            "inputs": {},
            "query": "hello",
            "response_mode": "blocking",
            "user": username,
            "conversation_id": "",
            "files":[]
        }

        response = await httpxAsyncClient.post(api_server + "/chat-messages", headers=headers, json=payload)
        if response.status_code != 200:
            raise RuntimeError(f"DifyAPI agent api error: {response.status_code}")

        data = json.loads(response.text)
        if 'conversation_id' not in data:
            logger.error(f"[AGENT] Engine create conversation failed: {data}")
            return ""
        return data['conversation_id']


    async def run(
        self, 
        input: TextMessage, 
        streaming: bool,
        **kwargs
    ):
        try:
            if not streaming:
                raise KeyError("Dify Agent only supports streaming mode")
            # 参数校验
            paramters = self.checkParameter(**kwargs)
            api_server = paramters["api_server"]
            api_key = paramters["api_key"]
            username = paramters["username"]
        
            conversation_id = paramters["conversation_id"] if "conversation_id" in paramters else ""
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}'
            }

            responseMode = "streaming" if streaming else "blocking"
            payload = {
                "inputs": {},
                "query": input.data,
                "response_mode": responseMode,
                "user": username,
                "conversation_id": conversation_id,
                "files":[]
            }

            pattern = re.compile(r'data:\s*({.*})')
            async with httpxAsyncClient.stream('POST', api_server + "/chat-messages", headers=headers, json=payload) as response:
                coversaiotnIdRequire = False if conversation_id else True
                async def generator(coversaiotnIdRequire):
                    message_id = ""
                    async for chunk in response.aiter_lines():
                        chunkStr = chunk.strip()
                        if not chunkStr: continue
                        chunkData = pattern.search(chunkStr)
                        # 返回不完整，该模板匹配会失效
                        if not chunkStr.endswith('}') or not chunkData: 
                            logger.warning(f"[AGENT] Engine return truncated data: {chunkStr}")
                            continue
                        chunkData = chunkData.group(1)

                        # 处理流式返回字符串
                        data = json.loads(chunkData)
                        # 首次返回conversation_id
                        if coversaiotnIdRequire and 'conversation_id' in data:
                            yield (EVENT_TYPE.CONVERSATION_ID, data['conversation_id'])
                            coversaiotnIdRequire = False
                        if not message_id and 'message_id' in data:
                            message_id = data['message_id']
                        if "message" in data["event"] and 'answer' in data:
                            logger.debug(f"[AGENT] Engine response: {data}")
                            yield (EVENT_TYPE.TEXT, data['answer'])
                    yield (EVENT_TYPE.MESSAGE_ID, message_id)
                async for parseResult in resonableStreamingParser(generator(coversaiotnIdRequire)):
                    yield parseResult
            yield eventStreamDone()
        except Exception as e:
            logger.error(f"[DifyApiAgent] Exception: {e}", exc_info=True)
            yield eventStreamError(str(e))