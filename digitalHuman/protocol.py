# -*- coding: utf-8 -*-
'''
@File    :   protocol.py
@Author  :   一力辉 
'''

from enum import Enum
from uuid import uuid4
from typing import Optional, Union, List, Dict
from datetime import datetime
from pydantic import BaseModel, Field

# ======================= 枚举类型 =======================
class StrEnum(str, Enum):
    def __str__(self):
        return str(self.value)

class IntEnum(int, Enum):
    def __str__(self):
        return str(self.value)

class ENGINE_TYPE(StrEnum):
    ASR = "ASR"
    TTS = "TTS"
    LLM = "LLM"
    AGENT = "AGENT"

class GENDER_TYPE(StrEnum):
    MALE = 'MALE'
    FEMALE = 'FEMALE'
    
class EVENT_TYPE(StrEnum):
    CONVERSATION_ID = 'CONVERSATION_ID'
    MESSAGE_ID = 'MESSAGE_ID'
    TEXT = 'TEXT'
    THINK = 'THINK'
    TASK = 'TASK'
    DONE = 'DONE'
    ERROR = 'ERROR'

class PARAM_TYPE(StrEnum):
    STRING = 'string'
    INT = 'int'
    FLOAT = 'float'
    BOOL = 'bool'


class AUDIO_TYPE(StrEnum):
    MP3 = 'mp3'
    WAV = 'wav'

class ROLE_TYPE(StrEnum):
    SYSTEM = 'system'
    USER = 'user'
    ASSISTANT = 'assistant'
    TOOL = 'tool'

class RESPONSE_CODE(IntEnum):
    OK = 0
    ERROR = -1

# ========================== Message =============================
class BaseMessage(BaseModel):
    """
    Base Protocol
    """
    # id: str = Field(default_factory=lambda: str(uuid4()))
    def __str__(self) -> str:
       return f'Message({self.model_dump()})'

class AudioMessage(BaseMessage):
    data: Optional[Union[str, bytes]] = None
    type: AUDIO_TYPE = AUDIO_TYPE.WAV
    sampleRate: int = 16000
    sampleWidth: int = 2

class TextMessage(BaseMessage):
    data: Optional[str] = None

class RoleMessage(BaseMessage):
    role: ROLE_TYPE
    content: str

# ========================== server =============================
class BaseResponse(BaseModel):
    code: RESPONSE_CODE
    message: str

# ========================== voice =============================
class VoiceDesc(BaseModel):
    name: str
    gender: GENDER_TYPE


# ========================== param =============================
class ParamDesc(BaseModel):
    name: str
    description: str
    type: PARAM_TYPE
    required: bool
    range: List[Union[str, int, float]] = []
    choices: List[Union[str, int, float]] = []
    default: Union[str, int, float, bool]

# ========================== engine =============================
class EngineDesc(BaseModel):
    name: str
    type: ENGINE_TYPE
    desc: str = ""
    meta: Dict = {}

class EngineConfig(BaseModel):
    name: str
    type: ENGINE_TYPE
    config: Dict

# ========================== user =============================
class UserDesc(BaseModel):
    user_id: str
    request_id: str
    cookie: str
    
# ========================== func =============================
def eventStreamResponse(event: EVENT_TYPE, data: str) -> str:
    message = "event: " + str(event) + "\ndata: " + data.replace("\n", "\\n") + "\n\n"
    return message

def eventStreamText(data: str) -> str:
    return eventStreamResponse(EVENT_TYPE.TEXT, data)

def eventStreamTask(task_id: str) -> str:
    return eventStreamResponse(EVENT_TYPE.TASK, task_id)

def eventStreamThink(data: str) -> str:
    return eventStreamResponse(EVENT_TYPE.THINK, data)

def eventStreamConversationId(conversation_id: str) -> str:
    return eventStreamResponse(EVENT_TYPE.CONVERSATION_ID, conversation_id)

def eventStreamMessageId(message_id: str) -> str:
    return eventStreamResponse(EVENT_TYPE.MESSAGE_ID, message_id)

def eventStreamDone() -> str:
    return f"event: {EVENT_TYPE.DONE}\ndata: Done\n\n"

def eventStreamError(error: str):
    return eventStreamResponse(EVENT_TYPE.ERROR, error)

def isEventStreamResponse(message: str) -> bool:
    return message.startswith("event:")