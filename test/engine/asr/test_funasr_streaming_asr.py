import os, sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
import asyncio
import json
import pyaudio
from digitalHuman.protocol import *
import websockets
from websockets import ClientConnection


async def send_message(ws: ClientConnection, action: str, message: str | bytes = b'') -> None:
    """发送WebSocket消息"""
    data = struct_message(action, message)
    await ws.send(data)
    # logger.debug(f"Sent action: {action}, payload size: {len(data) - PROTOCOL_HEADER_SIZE} bytes")

async def recv_message(ws: ClientConnection) -> Tuple[str, bytes]:
    """接收WebSocket消息"""
    message = await ws.recv()
    action, payload = parse_message(message)
    # logger.debug(f"Received action: {action.decode('utf-8').strip()}, payload size: {len(payload)} bytes")
    return action, payload

async def record_microphone(websocket: WebSocket):
    FORMAT = pyaudio.paInt16
    CHANNELS = 1
    RATE = 16000
    chunk_size = 60 * 10 / 10
    CHUNK = int(RATE / 1000 * chunk_size)

    p = pyaudio.PyAudio()

    stream = p.open(
        format=FORMAT, channels=CHANNELS, rate=RATE, input=True, frames_per_buffer=CHUNK
    )

    while True:
        payload = stream.read(CHUNK)
        # print("[音频数据传输]client -> server: ENGINE_PARTIAL_INPUT")
        await send_message(websocket, WS_RECV_ACTION_TYPE.ENGINE_PARTIAL_INPUT, payload)
        await asyncio.sleep(0.005)

async def asr_result(websocket: WebSocket):
    while True:
        action, payload = await recv_message(websocket)
        print(f"[识别结果传输]server -> client: {action}, {payload.decode('utf-8')}")

async def main():
    url = f"ws://127.0.0.1:8880/adh/asr/v0/engine/stream"
    items = {
        "engine": "funasrStreaming",
        "config": {
            "api_url": "ws://127.0.0.1:10095",
        },
        "data": ""
    }
    async with websockets.connect(url) as ws:
        print("[客户端启动引擎]client -> server: ENGINE_START")
        message = struct_message(WS_RECV_ACTION_TYPE.ENGINE_START, json.dumps(items).encode("utf-8"))
        await ws.send(message)
        # 引擎初始化
        message = await ws.recv()
        action, payload = parse_message(message)
        assert action == WS_SEND_ACTION_TYPE.ENGINE_INITIALZING
        print("[服务端初始化引擎]server -> client: ENGINE_INITIALZING")
        # 引擎准备就绪
        message = await ws.recv()
        action, payload = parse_message(message)
        assert action == WS_SEND_ACTION_TYPE.ENGINE_STARTED
        print("[服务端准备就绪]server -> client: ENGINE_STARTED")
        task_record_microphone = asyncio.create_task(record_microphone(ws))
        task_message = asyncio.create_task(asr_result(ws))
        await asyncio.gather(task_record_microphone, task_message)

if __name__ == '__main__':
    asyncio.run(main())