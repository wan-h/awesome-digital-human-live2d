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

class AsyncStreamBaseEngine(BaseEngine):
    async def run(self, input: BaseMessage, **kwargs) -> BaseMessage:
        raise NotImplementedError(f"This is stream engine! Not support ")

    @abstractmethod
    async def start_asr_stream(self, **kwargs) -> None:
        """
        通知 Agent 开始一个 ASR 流。
        Agent 应在此方法中初始化其 ASR 引擎的流式会话。
        (Tells the Agent to start an ASR stream.
        The Agent should initialize its ASR engine's streaming session in this method.)
        """
        pass

    @abstractmethod
    async def process_asr_chunk(self, audio_chunk: bytes, *args, **kwargs) -> None|str:
        """
        Agent 处理接收到的音频块。
        Agent 应将音频块传递给其 ASR 引擎，并可能返回部分转录结果。
        (Agent processes a received audio chunk.
        The Agent should pass the audio chunk to its ASR engine and may return a partial transcript.)
        Args:
            audio_chunk (bytes): The audio data chunk.
        Returns:
            Optional[str]: Partial transcription, if available.
        """
        pass

    @abstractmethod
    async def end_asr_stream(self, **kwargs) -> None | str:
        """
        通知 Agent 结束 ASR 流。
        Agent 应在此方法中结束其 ASR 引擎的流式会话，并返回最终的转录结果。
        (Tells the Agent to end the ASR stream.
        The Agent should end its ASR engine's streaming session in this method and return the final transcript.)
        Returns:
            Optional[str]: Final transcription.
        """
        pass