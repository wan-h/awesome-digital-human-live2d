import asyncio
import struct

import pytest
from httpx_ws import aconnect_ws

STREAM_API_PREFIX = "/adh/stream_asr"
FULLY_URL = f"ws://127.0.0.1:8000{STREAM_API_PREFIX}/v0/engine"

# 协议常量定义（与服务端保持一致）
ACTION_HEADER_SIZE = 18
DEFAULT_AUDIO_CHUNK_SIZE = 15360
MAX_PAYLOAD_SIZE = DEFAULT_AUDIO_CHUNK_SIZE * 2
PROTOCOL_HEADER_FORMAT = ">18sI"  # 大端序: 18字节action + 4字节无符号整数payload_size
PROTOCOL_HEADER_SIZE = struct.calcsize(PROTOCOL_HEADER_FORMAT)  # 22字节


def _format_action(action_name: str) -> bytes:
    """格式化action名称为18字节，右侧用空格填充"""
    if len(action_name) > ACTION_HEADER_SIZE:
        raise ValueError(
            f"Action name '{action_name}' exceeds {ACTION_HEADER_SIZE} bytes"
        )
    return action_name.ljust(ACTION_HEADER_SIZE).encode("utf-8")


class ActionType:
    # 客户端请求类型
    START_STREAM = _format_action("START_STREAM")
    AUDIO_CHUNK = _format_action("AUDIO_CHUNK")
    FINAL_CHUNK = _format_action("FINAL_CHUNK")
    END_STREAM = _format_action("END_STREAM")
    PING = _format_action("PING")

    # 服务端响应类型
    CONNECTION_ACK = _format_action("CONNECTION_ACK")
    ENGINE_READY = _format_action("ENGINE_READY")
    STREAM_STARTED = _format_action("STREAM_STARTED")
    PARTIAL_TRANSCRIPT = _format_action("PARTIAL_TRANSCRIPT")
    FINAL_TRANSCRIPT = _format_action("FINAL_TRANSCRIPT")
    STREAM_ENDED = _format_action("STREAM_ENDED")
    ERROR = _format_action("ERROR")
    PONG = _format_action("PONG")


def parse_binary_message(data: bytes) -> tuple[bytes, bytes]:
    """解析二进制消息，返回(action, payload)"""
    if len(data) < PROTOCOL_HEADER_SIZE:
        raise ValueError(
            f"Message too short: {len(data)} bytes, expected at least {PROTOCOL_HEADER_SIZE}"
        )

    action, payload_size = struct.unpack(
        PROTOCOL_HEADER_FORMAT, data[:PROTOCOL_HEADER_SIZE]
    )
    expected_total_size = PROTOCOL_HEADER_SIZE + payload_size
    if len(data) != expected_total_size:
        raise ValueError(
            f"Message size mismatch: got {len(data)} bytes, expected {expected_total_size}"
        )

    payload = (
        data[PROTOCOL_HEADER_SIZE : PROTOCOL_HEADER_SIZE + payload_size]
        if payload_size > 0
        else b""
    )
    return action, payload


def create_binary_message(action: bytes, payload: bytes = b"") -> bytes:
    """创建二进制消息"""
    if len(action) != ACTION_HEADER_SIZE:
        raise ValueError(
            f"Action must be exactly {ACTION_HEADER_SIZE} bytes, got {len(action)}"
        )

    payload_size = len(payload)
    header = struct.pack(PROTOCOL_HEADER_FORMAT, action, payload_size)
    return header + payload


def encode_text_payload(text: str) -> bytes:
    """将文本编码为UTF-8字节"""
    return text.encode("utf-8")


def decode_text_payload(payload: bytes) -> str:
    """将字节解码为UTF-8文本"""
    return payload.decode("utf-8") if payload else ""


@pytest.mark.asyncio
async def test_websocket_normal_flow(client, wavAudioZh):
    """
    测试 WebSocket 的正常流程（使用新的二进制协议）：
    - 建立连接
    - 初始化引擎
    - 开始语音流
    - 发送音频块并接收部分识别结果
    - 结束语音流并接收最终识别结果
    """

    async with aconnect_ws(FULLY_URL) as websocket:
        # Step 1: 接收 CONNECTION_ACK
        data = await websocket.receive_bytes()
        action, payload = parse_binary_message(data)
        assert action == ActionType.CONNECTION_ACK
        print("Connection ACK:", decode_text_payload(payload))

        # Step 2: 接收 ENGINE_READY
        data = await websocket.receive_bytes()
        action, payload = parse_binary_message(data)
        assert action == ActionType.ENGINE_READY
        print("Engine ready:", decode_text_payload(payload))

        # Step 3: 发送 START_STREAM
        start_message = create_binary_message(ActionType.START_STREAM)
        await websocket.send_bytes(start_message)

        # Step 4: 接收 STREAM_STARTED
        data = await websocket.receive_bytes()
        action, payload = parse_binary_message(data)
        assert action == ActionType.STREAM_STARTED
        print("Stream started:", decode_text_payload(payload))

        # 读取音频文件
        with open(wavAudioZh, "rb") as f:
            # 跳过WAV文件头（通常是44字节）
            f.seek(44)
            audio_data = f.read()

        # 模拟流式处理：将音频分成多个块
        chunk_size_bytes = 7680 * 2  # 480ms chunks for 16kHz

        # 分块处理音频
        for i in range(0, len(audio_data), chunk_size_bytes):
            # Step 5: 发送音频数据块
            chunk = audio_data[i : i + chunk_size_bytes]
            if not chunk:
                break

            # 判断是否为最后一个块
            is_final = i + chunk_size_bytes >= len(audio_data)

            # 发送普通音频块
            audio_message = create_binary_message(ActionType.AUDIO_CHUNK, chunk)
            await websocket.send_bytes(audio_message)

            # 尝试接收部分转录结果
            try:
                response = await asyncio.wait_for(websocket.receive_bytes(), 2)
                action, payload = parse_binary_message(response)
                if action == ActionType.PARTIAL_TRANSCRIPT:
                    transcript = decode_text_payload(payload)
                    print(f"Partial transcript {i}:", transcript)
                elif action == ActionType.ERROR:
                    error_msg = decode_text_payload(payload)
                    print(f"Error received: {error_msg}")
            except Exception:
                print(f"No response for chunk {i} (this is acceptable)")
            if is_final:
                final_message = create_binary_message(ActionType.FINAL_CHUNK, chunk)
                await websocket.send_bytes(final_message)

                # 接收最终转录结果
                response = await websocket.receive_bytes()
                action, payload = parse_binary_message(response)
                assert action == ActionType.FINAL_TRANSCRIPT
                final_transcript = decode_text_payload(payload)
                print("Final transcript:", final_transcript)
                assert final_transcript == "我认为跑步最重要的就是给我带来了身体健康"
        # Step 7: 发送 END_STREAM
        end_message = create_binary_message(ActionType.END_STREAM)
        await websocket.send_bytes(end_message)

        # Step 8: 接收 STREAM_ENDED
        data = await websocket.receive_bytes()
        action, payload = parse_binary_message(data)
        assert action == ActionType.STREAM_ENDED
        print("Stream ended:", decode_text_payload(payload))


@pytest.mark.asyncio
async def test_websocket_ping_pong(client):
    """
    测试 PING/PONG 心跳机制（使用新的二进制协议）
    """
    async with aconnect_ws(FULLY_URL
    ) as websocket:
        # 接收 CONNECTION_ACK 和 ENGINE_READY
        data = await websocket.receive_bytes()
        action, payload = parse_binary_message(data)
        assert action == ActionType.CONNECTION_ACK

        data = await websocket.receive_bytes()
        action, payload = parse_binary_message(data)
        assert action == ActionType.ENGINE_READY

        # 发送 PING（带测试payload）
        test_payload = encode_text_payload("test_ping")
        ping_message = create_binary_message(ActionType.PING, test_payload)
        await websocket.send_bytes(ping_message)

        # 接收 PONG
        data = await websocket.receive_bytes()
        action, payload = parse_binary_message(data)
        assert action == ActionType.PONG
        # 验证PONG返回相同的payload
        assert payload == test_payload
        print("PING/PONG test passed with payload:", decode_text_payload(payload))
