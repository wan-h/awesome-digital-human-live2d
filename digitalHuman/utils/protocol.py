# -*- coding: utf-8 -*-
'''
@File    :   protocol.py
@Author  :   一力辉 
'''

from enum import Enum
from uuid import uuid4
from typing import Optional
from pydantic import BaseModel, Field

# 支持的输入格式
class AudioFormatType(Enum):
    """
    Format Type
    """
    MP3 = "mp3"
    WAV  = "wav"

    def __str__(self):
        return str(self.value)

class BaseMessage(BaseModel):
    """
    Base Protocol
    """
    id: str = Field(default_factory=lambda: str(uuid4()))

class AudioMessage(BaseMessage):
    data: bytes
    format: AudioFormatType
    sampleRate: int
    sampleWidth: int
    desc: Optional[str] = None


class TextMessage(BaseMessage):
    data: Optional[str] = None
    desc: Optional[str] = None