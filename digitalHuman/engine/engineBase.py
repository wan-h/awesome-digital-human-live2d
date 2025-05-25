# -*- coding: utf-8 -*-
'''
@File    :   engineBase.py
@Author  :   一力辉 
'''

from typing import List, Optional, Union
from yacs.config import CfgNode as CN
from abc import ABCMeta, abstractmethod
from digitalHuman.utils import BaseMessage

__all__ = ["BaseEngine"]

class BaseEngine(metaclass=ABCMeta):
    def __init__(self, config: CN):
        self.cfg = config
        for key in self.checkKeys():
            if key not in self.cfg:
                raise KeyError(f"[{self.__class__.__name__}] {key} is not in config")
        self.setup()
    
    def __del__(self):
        self.release()
    
    @property
    def name(self) -> str:
        return self.cfg.NAME
    
    def parameters(self) -> List[str]:
        return self.cfg.PARAMETERS if "PARAMETERS" in self.cfg else []
    
    def setup(self):
        pass

    def release(self):
        pass

    def checkKeys(self) -> List[str]:
        return []

    @abstractmethod
    async def run(self, input: Union[BaseMessage, List[BaseMessage]], **kwargs) -> Optional[BaseMessage]:
        pass


class AsyncStreamEngine(BaseEngine):
    def __init__(self, config: CN):
        super().__init__(config)

    async def run(self, input: Union[BaseMessage, List[BaseMessage]], **kwargs) -> Optional[BaseMessage]:
        raise NotImplementedError(f"This is stream engine!")

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
    async def process_asr_chunk(self, audio_chunk: bytes, *args, **kwargs) -> Optional[str]:
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
    async def end_asr_stream(self, **kwargs) -> Optional[str]:
        """
        通知 Agent 结束 ASR 流。
        Agent 应在此方法中结束其 ASR 引擎的流式会话，并返回最终的转录结果。
        (Tells the Agent to end the ASR stream.
        The Agent should end its ASR engine's streaming session in this method and return the final transcript.)
        Returns:
            Optional[str]: Final transcription.
        """
        pass