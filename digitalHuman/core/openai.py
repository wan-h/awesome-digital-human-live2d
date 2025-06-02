# -*- coding: utf-8 -*-
'''
@File    :   openai.py
@Author  :   一力辉
'''

from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionChunk
from typing import List, AsyncGenerator
from digitalHuman.protocol import RoleMessage

class OpenaiLLM():
    @staticmethod
    async def chat(
        base_url: str, 
        api_key: str, 
        model: str, 
        messages: List[RoleMessage],
        **kwargs
    ) -> AsyncGenerator[ChatCompletionChunk, None]:
        client = AsyncOpenAI(
            base_url=base_url,
            api_key=api_key
        )
        completions = await client.chat.completions.create(
            model=model,
            messages=[message.model_dump() for message in messages],
            stream=True,
            **kwargs
        )
        async for chunk in completions:
            yield chunk