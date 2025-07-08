# -*- coding: utf-8 -*-
'''
@File    :   models.py
@Author  :   一力辉
'''

from typing import List, Dict, Union
from pydantic import BaseModel
from digitalHuman.server.reponse import BaseResponse
from digitalHuman.protocol import *

class EngineListResp(BaseResponse):
    data: List[EngineDesc] = []

class EngineDefaultResp(BaseResponse):
    data: EngineDesc

class EngineParam(BaseResponse):
    data: List[ParamDesc] = []

class EngineInput(BaseModel):
    engine: str = 'default'
    config: Dict = {}
    data: Union[str, bytes] = ""

class AgentEngineInput(EngineInput):
    conversation_id: str = ""

class ASREngineInput(EngineInput, AudioMessage):
    pass

class ASREngineOutput(BaseResponse):
    data: str

class VoiceListResp(BaseResponse):
    data: List[VoiceDesc] = []

class TTSEngineInput(EngineInput):
    pass

class TTSEngineOutput(BaseResponse, AudioMessage):
    pass

class LLMEngineInput(EngineInput):
    pass

class ConversationInput(BaseModel):
    data: Dict = {}

class ConversationIdResp(BaseResponse):
    data: str