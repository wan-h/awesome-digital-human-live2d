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
from digitalHuman.utils import httpxAsyncClient, logger, resonableStreamingParser, checkResponse

__all__ = ["CozeApiAgent"]


@AGENTS.register("Coze")
class CozeApiAgent(BaseAgent):
    async def createConversation(self, **kwargs) -> str:
        # 参数校验
        paramters = self.checkParameter(**kwargs)
        token = paramters["token"]

        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

        response = await httpxAsyncClient.post('https://api.coze.cn/v1/conversation/create', headers=headers)
        result = checkResponse(response, "CozeApiAgent", "create conversation")
        return result['data']['id']


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
            token = paramters["token"]
            bot_id = paramters["bot_id"]
            conversation_id = paramters["conversation_id"] if "conversation_id" in paramters else ""
            
            headers = {
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }

            payload = {
                'bot_id': bot_id,
                'user_id': 'adh',
                'stream': True,
                'auto_save_history': True,
                'additional_messages': [{
                    'role': 'user',
                    'content': input.data,
                    "content_type":"text"
                }]
            }

            api_url = f'https://api.coze.cn/v3/chat?conversation_id={conversation_id}'

            if not conversation_id:
                conversation_id = await self.createConversation(**kwargs)
                yield eventStreamConversationId(conversation_id)
            
            async with httpxAsyncClient.stream('POST', api_url, headers=headers, json=payload) as response:
                event = None
                async for chunk in response.aiter_lines():
                    chunkStr = chunk.strip()
                    if not chunkStr: continue
                    if chunkStr.startswith('event:'):
                        event = chunkStr.split(':', 1)[1].strip()
                    if event == 'conversation.message.delta' and 'data:' in chunkStr:
                        message_data = chunkStr.split('data:', 1)[1].strip()
                        if message_data:
                            message_json = json.loads(message_data)
                            reasoning_content = message_json.get('reasoning_content', '')
                            if reasoning_content:
                                yield eventStreamThink(reasoning_content)
                            content = message_json.get('content', '')
                            if content:
                                yield eventStreamText(content)
            yield eventStreamDone()
        except Exception as e:
            logger.error(f"[DifyApiAgent] Exception: {e}", exc_info=True)
            yield eventStreamError(str(e))