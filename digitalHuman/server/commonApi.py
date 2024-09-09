# -*- coding: utf-8 -*-
'''
@File    :   common.py
@Author  :   一力辉 
'''

from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect


class ConnectionManager:
    def __init__(self):
        # 存放激活的ws连接对象
        self.active_connections: List[WebSocket] = []
 
    async def connect(self, ws: WebSocket):
        # 等待连接
        await ws.accept()
        # 存储ws连接对象
        self.active_connections.append(ws)
 
    def disconnect(self, ws: WebSocket):
        # 关闭时 移除ws对象
        if ws in self.active_connections:
            self.active_connections.remove(ws)
        else:
            print("未找到ws对象")
 
    @staticmethod
    async def send_personal_message(message: str, ws: WebSocket):
        # 发消息
        await ws.send_text(message)
 
    async def broadcast(self, message: str):
        # 广播消息
        for connection in self.active_connections:
            await connection.send_text(message)


router = APIRouter()
ws_manager = ConnectionManager()


@router.websocket("/v0/heartbeat")
async def websocket_heartbeat(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await ws_manager.send_personal_message("pong", websocket)
            else:
                # 暂不处理其它消息格式: 非探活则关闭接口
                await ws_manager.send_personal_message("非探活请求,关闭ws连接,关闭ws后,需要重新建立连接...", websocket)
                ws_manager.disconnect(websocket)

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
