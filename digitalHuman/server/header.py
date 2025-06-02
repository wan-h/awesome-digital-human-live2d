# -*- coding: utf-8 -*-
'''
@File    :   header.py
@Author  :   一力辉
'''

from typing import Annotated
from fastapi import Header, Depends
from digitalHuman.protocol import UserDesc

class _HeaderInfo(UserDesc):
    """请求头信息"""
    def __init__(
        self,
        user_id: str = Header("tester", alias="user-id", description="用户ID"),
        request_id: str = Header("", alias="request-id", description="请求ID"),
        cookie: str = Header("", alias="cookie", description="cookie")
    ):
        super().__init__(user_id=user_id, request_id=request_id, cookie=cookie)
    
    def __str__(self):
        return f"user-id: {self.user_id} request-id: {self.request_id} cookie: {self.cookie}"
    
    def __repr__(self):
        return self.__str__()

HeaderInfo = Annotated[_HeaderInfo, Depends(_HeaderInfo)]