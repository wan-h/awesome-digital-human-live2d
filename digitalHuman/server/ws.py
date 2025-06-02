# -*- coding: utf-8 -*-
'''
@File    :   ws.py
@Author  :   一力辉 
'''

from typing import List
from fastapi import WebSocket

class WebsocketManager:
    def __init__(self):
        # 存放激活的ws连接对象
        self._connections: List[WebSocket] = []
 
    async def connect(self, ws: WebSocket) -> None:
        # 等待连接
        await ws.accept()
        # 存储ws连接对象
        self._connections.append(ws)
 
    def disconnect(self, ws: WebSocket) -> None:
        # 关闭时 移除ws对象
        if ws in self._connections:
            self._connections.remove(ws)
 
    @staticmethod
    async def sendMessage(message: str, ws: WebSocket) -> None:
        # 发消息
        await ws.send_text(message)
 
    async def broadcast(self, message: str) -> None:
        # 广播消息
        for connection in self._connections:
            await connection.send_text(message)