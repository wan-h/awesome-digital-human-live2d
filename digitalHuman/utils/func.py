# -*- coding: utf-8 -*-
'''
@File    :   utils.py
@Author  :   一力辉
'''

import re
from uuid import uuid4
from httpx import Response
from typing import Dict
from digitalHuman.utils import logger

__all__ = ['generateId', 'checkResponse']

def generateId() -> str:
    return str(uuid4())

def checkResponse(response: Response, module: str, note: str = "") -> Dict:
    """
    校验请求响应是否正常
    不正常直接抛错
    """
    if response.status_code == 200:
        return response.json()
    logger.error(f"[{module}] {note}, status code: {response.status_code}, data: {response.text}", exc_info=True)
    # 优先提取message错误信息
    try:
        message = response.json()['message']
    except:
        message = response.text
    raise RuntimeError(message)

