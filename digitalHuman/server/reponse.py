# -*- coding: utf-8 -*-
'''
@File    :   reponse.py
@Author  :   一力辉 
'''

from enum import Enum
from typing import Any
from pydantic import BaseModel
from digitalHuman.utils import logger

class BaseResponse(BaseModel):
    code: int
    message: str

class CODE(Enum):
    OK = 0
    ERROR = -1

class Response(object):
    def __init__(self):
        self._response_dict = {}
        self.code = CODE.OK
        self.message = "SUCCESS"

    def __setattr__(self, name: str, value: Any):
        if name.startswith('_'):
            self.__dict__[name] = value
        else:
            self._response_dict[name] = value

    def __getattr__(self, name: str):
        if name.startswith('_'):
            return self.__dict__[name]
        else:
            return self._response_dict[name]

    def _message_log_summary(self, message: str, isError: bool):
        self.message = message
        if isError:
            logger.error(message)
        else:
            logger.debug(message)

    def ok(self, message: str):
        self.code = CODE.OK
        self._message_log_summary(message, False)

    def error(self, message: str):
        self.code = CODE.ERROR
        self._message_log_summary(message, True)

    def validate(self, outItem: BaseModel):
        resp_json = outItem.model_validate(self._response_dict)
        # return json
        return resp_json.model_dump()