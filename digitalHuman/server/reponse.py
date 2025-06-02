# -*- coding: utf-8 -*-
'''
@File    :   reponse.py
@Author  :   一力辉 
'''

from typing import Any
from pydantic import BaseModel
from digitalHuman.protocol import RESPONSE_CODE, BaseResponse, eventStreamError, eventStreamDone
from digitalHuman.utils import logger


class Response(object):
    def __init__(self):
        self._response_dict = {}
        self.code = RESPONSE_CODE.OK
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
            logger.error(message, exc_info=True)
        else:
            logger.debug(message)

    def ok(self, message: str):
        self.code = RESPONSE_CODE.OK
        self._message_log_summary(message, False)

    def error(self, message: str, code: RESPONSE_CODE = RESPONSE_CODE.ERROR):
        self.code = code
        self._message_log_summary(message, True)

    def validate(self, outItem: BaseModel):
        resp_json = outItem.model_validate(self._response_dict)
        # return json
        return resp_json.model_dump()

async def streamInteralError(error: str = "Interal Error"):
    yield eventStreamError(error)
    yield eventStreamDone()