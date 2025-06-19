# -*- coding: utf-8 -*-
'''
@File    :   protocol.py
@Author  :   一力辉 
'''

import struct
from enum import Enum
from uuid import uuid4
from typing import Optional, Union, List, Dict, Tuple
from datetime import datetime
from pydantic import BaseModel, Field
from fastapi import WebSocket

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

class INFER_TYPE(StrEnum):
    NORMAL = 'normal'
    STREAM = 'stream'

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
    infer_type: INFER_TYPE
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


# ========================== websocket =============================
# 协议常量定义
ACTION_HEADER_SIZE = 18  # action字段大小（18字节）
# 协议格式: [Action(18字节)] + [Payload Size(4字节)] + [Payload(可变长度)]
PROTOCOL_HEADER_FORMAT = ">18sI"  # 大端序: 18字节action + 4字节无符号整数payload_size
PROTOCOL_HEADER_SIZE = struct.calcsize(PROTOCOL_HEADER_FORMAT)  # 22字节

class WS_RECV_ACTION_TYPE(StrEnum):
    """客户端请求类型"""
    PING = "PING"  # 心跳包
    ENGINE_START = "ENGINE_START"  # 启动引擎
    ENGINE_PARTIAL_INPUT = "PARTIAL_INPUT"  # 引擎输入
    ENGINE_FINAL_INPUT = "FINAL_INPUT"  # 引擎输入
    ENGINE_STOP = "ENGINE_STOP"  # 停止引擎

class WS_SEND_ACTION_TYPE(StrEnum):
    """服务端响应类型"""
    PONG = "PONG"  # 心跳响应
    ENGINE_INITIALZING = "ENGINE_INITIALZING"  # 引擎初始化
    ENGINE_STARTED = "ENGINE_STARTED"  # 引擎准备就绪
    ENGINE_PARTIAL_OUTPUT = "PARTIAL_OUTPUT"  # 引擎输出
    ENGINE_FINAL_OUTPUT = "FINAL_OUTPUT"  # 引擎输出
    ENGINE_STOPPED = "ENGINE_STOPPED"  # 关闭引擎
    ERROR = "ERROR"  # 错误响应

def _format_action(action_name: str) -> bytes:
    """格式化action名称为18字节，右侧用空格填充"""
    if len(action_name) > ACTION_HEADER_SIZE:
        raise ValueError(
            f"Action name '{action_name}' exceeds {ACTION_HEADER_SIZE} bytes"
        )
    return action_name.ljust(ACTION_HEADER_SIZE).encode("utf-8")

def struct_message(action: str, message: str | bytes) -> bytes:
    """构造发送消息"""
    if isinstance(message, str):
        message = message.encode("utf-8")
    action_bytes = _format_action(action)
    payload_size = len(message)
    # 打包协议头部: action(18字节) + payload_size(4字节)
    header = struct.pack(PROTOCOL_HEADER_FORMAT, action_bytes, payload_size)
    return header + message

def parse_message(message: bytes) -> Tuple[str, bytes]:
    """解析接收到的消息"""
    if len(message) < PROTOCOL_HEADER_SIZE:
        raise ValueError(
            f"Message too short: {len(message)} bytes, expected at least {PROTOCOL_HEADER_SIZE}"
        )
    # 解析协议头部: action(18字节) + payload_size(4字节)
    action, payload_size = struct.unpack(
        PROTOCOL_HEADER_FORMAT, message[:PROTOCOL_HEADER_SIZE]
    )

    expected_total_size = PROTOCOL_HEADER_SIZE + payload_size
    if len(message) != expected_total_size:
        raise ValueError(
            f"Message size mismatch: got {len(message)} bytes, expected {expected_total_size}"
        )

    # 提取payload
    payload = message[PROTOCOL_HEADER_SIZE : PROTOCOL_HEADER_SIZE + payload_size] if payload_size > 0 else b""

    return (action.decode("utf-8").strip(), payload)

class WebSocketHandler(): 
    """
    websocket处理类(协议控制)
    """

    @staticmethod
    async def connect(ws: WebSocket) -> None:
        """连接WebSocket"""
        await ws.accept()
        # logger.debug(f"WebSocket connected: {ws.client.host}")
    
    @staticmethod
    async def disconnect(ws: WebSocket):
        """断开WebSocket连接"""
        await ws.close()
        # logger.debug(f"WebSocket disconnected: {ws.client.host}")

    @staticmethod
    async def send_message(ws: WebSocket, action: str, message: str | bytes = b'') -> None:
        """发送WebSocket消息"""
        data = struct_message(action, message)
        await ws.send_bytes(data)
        # logger.debug(f"Sent action: {action}, payload size: {len(data) - PROTOCOL_HEADER_SIZE} bytes")
    
    @staticmethod
    async def recv_message(ws: WebSocket) -> Tuple[str, bytes]:
        """接收WebSocket消息"""
        message = await ws.receive_bytes()
        action, payload = parse_message(message)
        # logger.debug(f"Received action: {action.decode('utf-8').strip()}, payload size: {len(payload)} bytes")
        return action, payload