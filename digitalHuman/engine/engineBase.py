# -*- coding: utf-8 -*-
'''
@File    :   engineBase.py
@Author  :   一力辉 
'''

from typing import List
from abc import abstractmethod
from digitalHuman.core import BaseRunner
from digitalHuman.protocol import BaseMessage, TextMessage, AudioMessage, VoiceDesc

__all__ = ["BaseEngine"]

class BaseEngine(BaseRunner):
    @abstractmethod
    async def run(self, input: BaseMessage, **kwargs) -> BaseMessage:
        raise NotImplementedError

class BaseLLMEngine(BaseEngine):
    @abstractmethod
    async def run(self, input, streaming: bool = True, **kwargs):
        raise NotImplementedError

class BaseASREngine(BaseEngine):
    @abstractmethod
    async def run(self, input: AudioMessage, **kwargs) -> TextMessage:
        raise NotImplementedError

class BaseTTSEngine(BaseEngine):
    async def voices(self) -> List[VoiceDesc]:
        return []

    @abstractmethod
    async def run(self, input: TextMessage, **kwargs) -> AudioMessage:
        raise NotImplementedError