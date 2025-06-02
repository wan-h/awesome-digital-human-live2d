# -*- coding: utf-8 -*-
'''
@File    :   common.py
@Author  :   一力辉 
'''

from fastapi import APIRouter, WebSocket
from digitalHuman.server.ws import WebsocketManager
from digitalHuman.utils import logger


router = APIRouter(prefix="/common/v0")
wsManager = WebsocketManager()

# ========================= 心跳包 ===========================
@router.websocket("/heartbeat")
async def websocket_heartbeat(websocket: WebSocket):
    try:
        await wsManager.connect(websocket)
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await wsManager.sendMessage("pong", websocket)
            else:
                # 暂不处理其它消息格式: 非探活则关闭接口
                await wsManager.sendMessage("Received unsupported message", websocket)
                wsManager.disconnect(websocket)
    except Exception as e:
        logger.error(f"[SERVER] websocket_heartbeat: {str(e)}")
        wsManager.disconnect(websocket)
