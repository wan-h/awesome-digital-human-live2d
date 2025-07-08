import json
import asyncio
import websockets
from fastapi import WebSocket, WebSocketDisconnect
from digitalHuman.utils import logger
from digitalHuman.engine.builder import ASREngines
from digitalHuman.protocol import *
from digitalHuman.engine.engineBase import StreamBaseEngine

__all__ = ["FunasrStreamingAsr"]


@ASREngines.register("funasrStreaming")
class FunasrStreamingAsr(StreamBaseEngine):
    async def _reset_sentence(self, funasrWebsocket: websockets.ClientConnection):
        """重置说话识别, 防止连续识别添加标点符号"""
        message = json.dumps(
            {
                "is_speaking": False,
            }
        )
        await funasrWebsocket.send(message)
        message = json.dumps(
            {
                "is_speaking": True,
            }
        )
        await funasrWebsocket.send(message)

    async def _task_send(self, adhWebsocket: WebSocket, funasrWebsocket: websockets.ClientConnection):
        """
        funasr server -> adh server -> adh web
        """
        text_send = ""
        text_send_2pass_online = ""
        text_send_2pass_offline = ""
        try:
            while True:
                meg = await funasrWebsocket.recv()
                meg = json.loads(meg)
                wav_name = meg.get("wav_name", "demo")
                text = meg["text"]
                timestamp = ""
                offline_msg_done = meg.get("is_final", False)
                if "timestamp" in meg:
                    timestamp = meg["timestamp"]
                if "mode" not in meg:
                    continue
                if meg["mode"] == "online":
                    text_send += text
                elif meg["mode"] == "offline":
                    text_send += text
                    offline_msg_done = True
                else:
                    if meg["mode"] == "2pass-online":
                        text_send_2pass_online += text
                        text_send = text_send_2pass_offline + text_send_2pass_online
                    else:
                        offline_msg_done = True
                        text_send_2pass_online = ""
                        text_send = text_send_2pass_offline + text
                        text_send_2pass_offline += text
                if offline_msg_done:
                    await WebSocketHandler.send_message(adhWebsocket, WS_SEND_ACTION_TYPE.ENGINE_FINAL_OUTPUT, text_send)
                    text_send = ""
                    text_send_2pass_online = ""
                    text_send_2pass_offline = ""
                    await self._reset_sentence(funasrWebsocket)
                else:
                    await WebSocketHandler.send_message(adhWebsocket, WS_SEND_ACTION_TYPE.ENGINE_PARTIAL_OUTPUT, text_send)
        except WebSocketDisconnect:
            logger.debug("adhWebsocket closed, task_send exit")
        except websockets.ConnectionClosed:
            logger.debug("funasrWebsocket closed, task_send exit")
        except Exception as e:
            logger.error(f"FunasrStreamingAsr task_send error: {e}")
            await WebSocketHandler.send_message(adhWebsocket, WS_SEND_ACTION_TYPE.ERROR, str(e))

    async def _task_recv(self, adhWebsocket: WebSocket, funasrWebsocket: websockets.ClientConnection, mode: str):
        """
        adh web -> adh server -> funasr server
        """
        try:
            message = json.dumps(
                {
                    "mode": mode,
                    "chunk_size": [5, 10, 5], # chunk_size: 60 * 10 ms. 左看300ms, 右看300ms
                    "chunk_interval": 10,
                    "encoder_chunk_look_back": 4,
                    "decoder_chunk_look_back": 0,
                    "wav_name": "adh",
                    "is_speaking": True,
                    "hotwords": "",
                    "itn": True,
                }
            )
            await funasrWebsocket.send(message)
            await WebSocketHandler.send_message(adhWebsocket, WS_SEND_ACTION_TYPE.ENGINE_STARTED)
            while True:
                action, payload = await WebSocketHandler.recv_message(adhWebsocket)
                match action:
                    case WS_RECV_ACTION_TYPE.PING:
                        await WebSocketHandler.send_message(adhWebsocket, WS_SEND_ACTION_TYPE.PONG.value, b"")
                    case WS_RECV_ACTION_TYPE.ENGINE_START:
                        raise RuntimeError("FunasrStreamingAsr has benn started")
                    case WS_RECV_ACTION_TYPE.ENGINE_PARTIAL_INPUT:
                        await funasrWebsocket.send(payload)
                    case WS_RECV_ACTION_TYPE.ENGINE_FINAL_INPUT:
                        message = json.dumps(
                            {
                                "is_speaking": False
                            }
                        )
                        await funasrWebsocket.send(message)
                        await funasrWebsocket.send(payload)
                    case WS_RECV_ACTION_TYPE.ENGINE_STOP:
                        await funasrWebsocket.close()
                        await WebSocketHandler.send_message(adhWebsocket, WS_SEND_ACTION_TYPE.ENGINE_STOPPED)
                        return
                    case _:
                        raise RuntimeError(f"FunasrStreamingAsr task_recv error: {action} not found")
        except WebSocketDisconnect:
            logger.debug("funasrWebsocket closed, task_recv exit")
        except Exception as e:
            logger.error(f"FunasrStreamingAsr task_recv error: {e}")
            await WebSocketHandler.send_message(adhWebsocket, WS_SEND_ACTION_TYPE.ERROR, str(e))

    async def run(self, websocket: WebSocket, **kwargs) -> None:
        # 参数校验
        paramters = self.checkParameter(**kwargs)
        API_URL = paramters["api_url"]
        MODE = paramters["mode"]
        await WebSocketHandler.send_message(websocket, WS_SEND_ACTION_TYPE.ENGINE_INITIALZING)
        # 连接服务器
        async with websockets.connect(API_URL, subprotocols=["binary"], ping_interval=None) as funasrWebsocket:
            # adh web -> adh server -> funasr server
            task_recv = asyncio.create_task(self._task_recv(websocket, funasrWebsocket, MODE))
            # funasr server -> adh server -> adh web
            task_send = asyncio.create_task(self._task_send(websocket, funasrWebsocket))
            await asyncio.gather(task_recv, task_send)