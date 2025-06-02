# -*- coding: utf-8 -*-
'''
@File    :   openaiAgnet.py
@Author  :   一力辉 
'''

from ..builder import AGENTS
from ..agentBase import BaseAgent
from digitalHuman.protocol import *
from digitalHuman.utils import logger, resonableStreamingParser
from digitalHuman.core import OpenaiLLM

__all__ = ["OpenaiApiAgent"]

@AGENTS.register("OpenAI")
class OpenaiApiAgent(BaseAgent):
    async def run(
        self, 
        user: UserDesc,
        input: TextMessage, 
        streaming: bool = True,
        conversation_id: str = "",
        **kwargs
    ):
        try:
            if not isinstance(input, TextMessage):
                raise RuntimeError("OpenAI Agent only support TextMessage")
            # 参数校验
            paramters = self.checkParameter(**kwargs)
            API_URL = paramters["base_url"]
            API_KEY = paramters["api_key"]
            API_MODEL = paramters["model"]

            coversaiotnIdRequire = False if conversation_id else True
            if coversaiotnIdRequire:
                conversation_id = await self.createConversation()
                yield eventStreamConversationId(conversation_id)

            async def generator(user_id: str, conversation_id: str, query: str):
                thinkResponses = ""
                responses = ""
                currentMessage = [RoleMessage(role=ROLE_TYPE.USER, content=query)]
                messages = currentMessage
                async for chunk in OpenaiLLM.chat(
                    base_url=API_URL,
                    api_key=API_KEY,
                    model=API_MODEL,
                    messages=messages
                ):
                    if not chunk: continue
                    if len(chunk.choices) == 0: continue
                    delta = chunk.choices[0].delta.model_dump()
                    if 'reasoning_content' in delta and delta['reasoning_content']:
                        reasoning_content = delta['reasoning_content']
                        thinkResponses += reasoning_content
                        yield (EVENT_TYPE.THINK, reasoning_content)
                    elif 'content' in delta and delta['content']:
                        content = delta['content']
                        responses += content
                        yield (EVENT_TYPE.TEXT, content)
                currentMessage.append(RoleMessage(role=ROLE_TYPE.ASSISTANT, content=responses))
            async for parseResult in resonableStreamingParser(generator(user.user_id, conversation_id, input.data)):
                yield parseResult
            yield eventStreamDone()
        except Exception as e:
            logger.error(f"[OpenaiApiAgent] Exception: {e}", exc_info=True)
            yield eventStreamError(str(e))