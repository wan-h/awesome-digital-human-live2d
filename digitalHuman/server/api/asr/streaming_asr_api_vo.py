import logging
import struct
from enum import Enum
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from digitalHuman.engine import EnginePool
from digitalHuman.engine.asr.funasrStreamingASR import FunasrStreamingASR
from digitalHuman.protocol import ENGINE_TYPE

# 基本的日志配置
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stream_asr/v0")
engine_pool = EnginePool()

# 协议常量定义
ACTION_HEADER_SIZE = 18  # action字段大小（18字节）
DEFAULT_AUDIO_CHUNK_SIZE = 15360  # 默认音频块大小
MAX_PAYLOAD_SIZE = DEFAULT_AUDIO_CHUNK_SIZE * 2  # 最大payload大小

# 协议格式: [Action(18字节)] + [Payload Size(4字节)] + [Payload(可变长度)]
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
    START_STREAM = _format_action("START_STREAM")  # 开始流式识别
    AUDIO_CHUNK = _format_action("AUDIO_CHUNK")  # 普通音频数据块
    FINAL_CHUNK = _format_action("FINAL_CHUNK")  # 最终音频数据块（带is_final=True）
    END_STREAM = _format_action("END_STREAM")  # 结束流式识别
    PING = _format_action("PING")  # 心跳包

    # 服务端响应类型
    CONNECTION_ACK = _format_action("CONNECTION_ACK")  # 连接确认
    ENGINE_READY = _format_action("ENGINE_READY")  # 引擎就绪
    STREAM_STARTED = _format_action("STREAM_STARTED")  # 流开始确认
    PARTIAL_TRANSCRIPT = _format_action("PARTIAL_TRANSCRIPT")  # 部分识别结果
    FINAL_TRANSCRIPT = _format_action("FINAL_TRANSCRIPT")  # 最终识别结果
    STREAM_ENDED = _format_action("STREAM_ENDED")  # 流结束确认
    ERROR = _format_action("ERROR")  # 错误信息
    PONG = _format_action("PONG")  # 心跳响应


# DefineWebSocket连接的状态
class ConnectionState(Enum):
    IDLE = "IDLE"  # 空闲状态，等待客户端指令
    INITIALIZING = "INITIALIZING"  # ASR引擎正在初始化
    LISTENING = "LISTENING"  # 正在接收音频流
    PROCESSING = "PROCESSING"  # 正在处理音频（可能在LISTENING时并行，或在音频结束后）
    ERROR = "ERROR"  # 发生错误


class StreamingASRService:
    def __init__(self):
        self.state = ConnectionState.IDLE
        self.asr_engine: Optional[FunasrStreamingASR] = None
        logger.info("StreamingASRService instance created.")
        self.current_buffer = bytearray()
        self.param_dict = {"cache": dict(), "is_final": False}
        self.transcription_result = ""

    def parse_binary_message(self, data: bytes) -> tuple[bytes, bytes]:
        """使用struct解析二进制消息，返回(action, payload)"""
        if len(data) < PROTOCOL_HEADER_SIZE:
            raise ValueError(
                f"Message too short: {len(data)} bytes, expected at least {PROTOCOL_HEADER_SIZE}"
            )

        # 解析协议头部: action(18字节) + payload_size(4字节)
        action, payload_size = struct.unpack(
            PROTOCOL_HEADER_FORMAT, data[:PROTOCOL_HEADER_SIZE]
        )

        # 验证payload大小
        if payload_size > MAX_PAYLOAD_SIZE:
            raise ValueError(
                f"Payload size too large: {payload_size} bytes, max allowed: {MAX_PAYLOAD_SIZE}"
            )

        expected_total_size = PROTOCOL_HEADER_SIZE + payload_size
        if len(data) != expected_total_size:
            raise ValueError(
                f"Message size mismatch: got {len(data)} bytes, expected {expected_total_size}"
            )

        # 提取payload
        payload = (
            data[PROTOCOL_HEADER_SIZE : PROTOCOL_HEADER_SIZE + payload_size]
            if payload_size > 0
            else b""
        )

        return action, payload

    def create_binary_response(self, action: bytes, payload: bytes = b"") -> bytes:
        """使用struct创建二进制响应消息"""
        if len(action) != ACTION_HEADER_SIZE:
            raise ValueError(
                f"Action must be exactly {ACTION_HEADER_SIZE} bytes, got {len(action)}"
            )

        payload_size = len(payload)
        if payload_size > MAX_PAYLOAD_SIZE:
            raise ValueError(
                f"Payload size too large: {payload_size} bytes, max allowed: {MAX_PAYLOAD_SIZE}"
            )

        # 打包协议头部: action(18字节) + payload_size(4字节)
        header = struct.pack(PROTOCOL_HEADER_FORMAT, action, payload_size)

        return header + payload

    def encode_text_payload(self, text: str) -> bytes:
        """将文本编码为UTF-8字节"""
        encoded = text.encode("utf-8")
        if len(encoded) > MAX_PAYLOAD_SIZE:
            raise ValueError(
                f"Text payload too large: {len(encoded)} bytes, max allowed: {MAX_PAYLOAD_SIZE}"
            )
        return encoded

    def decode_text_payload(self, payload: bytes) -> str:
        """将字节解码为UTF-8文本"""
        return payload.decode("utf-8") if payload else ""

    async def initialize_engine(self, engine_name: str):
        """
        异步初始化ASR引擎。
        Asynchronously initializes the ASR engine.
        """
        if self.asr_engine is not None:
            logger.info("ASR engine already initialized.")
            return True

        self.state = ConnectionState.INITIALIZING
        logger.info("Initializing FunasrStreamingASR engine...")
        try:
            self.asr_engine = engine_pool.getEngine(ENGINE_TYPE.ASR, engine_name)
            self.state = ConnectionState.IDLE  # Ready to start listening
            logger.info("FunasrStreamingASR engine initialized successfully.")
            return True
        except Exception as e:
            logger.error(
                f"Failed to initialize FunasrStreamingASR engine: {e}", exc_info=True
            )
            self.state = ConnectionState.ERROR
            self.asr_engine = None  # Ensure it's None if init failed
            return False

    async def handle_binary_message(self, websocket: WebSocket, data: bytes):
        """处理从客户端接收到的二进制消息"""
        try:
            action, payload = self.parse_binary_message(data)
            logger.info(
                f"Received action: {action} with payload size: {len(payload)} bytes"
            )

            if action == ActionType.START_STREAM:
                await self._handle_start_stream(websocket, payload)
            elif action == ActionType.AUDIO_CHUNK:
                await self._handle_audio_chunk(websocket, payload, is_final=False)
            elif action == ActionType.FINAL_CHUNK:
                await self._handle_audio_chunk(websocket, payload, is_final=True)
            elif action == ActionType.END_STREAM:
                await self._handle_end_stream(websocket)
            elif action == ActionType.PING:
                await self._handle_ping(websocket, payload)
            else:
                error_msg = f"Unknown action type: {action}"
                logger.warning(error_msg)
                response = self.create_binary_response(
                    ActionType.ERROR, self.encode_text_payload(error_msg)
                )
                await websocket.send_bytes(response)

        except Exception as e:
            error_msg = f"Error processing binary message: {str(e)}"
            logger.error(error_msg, exc_info=True)
            response = self.create_binary_response(
                ActionType.ERROR, self.encode_text_payload(error_msg)
            )
            await websocket.send_bytes(response)

    async def _handle_start_stream(self, websocket: WebSocket, payload: bytes):
        """处理开始流式识别"""
        if not self.asr_engine:
            error_msg = "ASR Engine not ready"
            logger.warning(error_msg)
            response = self.create_binary_response(
                ActionType.ERROR, self.encode_text_payload(error_msg)
            )
            await websocket.send_bytes(response)
            return

        if self.state == ConnectionState.IDLE:
            self.param_dict = {"cache": dict(), "is_final": False}
            self.transcription_result = ""
            self.asr_engine.start_asr_stream()
            self.state = ConnectionState.LISTENING

            success_msg = "ASR stream started. Ready for audio."
            response = self.create_binary_response(
                ActionType.STREAM_STARTED, self.encode_text_payload(success_msg)
            )
            await websocket.send_bytes(response)
            logger.info("State changed to LISTENING. Stream started.")
        else:
            error_msg = f"Cannot start stream in current state: {self.state.value}"
            logger.warning(error_msg)
            response = self.create_binary_response(
                ActionType.ERROR, self.encode_text_payload(error_msg)
            )
            await websocket.send_bytes(response)

    async def _handle_audio_chunk(
        self, websocket: WebSocket, payload: bytes, is_final: bool = False
    ):
        """处理音频数据块"""
        if not self.asr_engine or self.state != ConnectionState.LISTENING:
            logger.warning(
                f"Received audio chunk but not in LISTENING state or engine not ready. State: {self.state.value}. Discarding audio."
            )
            return

        if len(payload) == 0:
            logger.warning("Received empty audio payload")
            return

        try:
            # 设置is_final标志
            if is_final:
                self.param_dict["is_final"] = True
                logger.info(
                    f"Processing final audio chunk, length: {len(payload)} bytes"
                )
            else:
                self.param_dict["is_final"] = False
                logger.debug(f"Processing audio chunk, length: {len(payload)} bytes")

            partial_result = self.asr_engine.process_asr_chunk(
                payload, param_dict=self.param_dict, current_buffer=self.current_buffer
            )
            if is_final:
                # 对于最终块，发送最终转录结果
                self.transcription_result += partial_result
                response = self.create_binary_response(
                    ActionType.FINAL_TRANSCRIPT,
                    self.encode_text_payload(self.transcription_result),
                )
                await websocket.send_bytes(response)
                logger.info(f"Sent final transcript: {partial_result}")
                return
            if partial_result:
                # 对于普通块，发送部分转录结果
                response = self.create_binary_response(
                    ActionType.PARTIAL_TRANSCRIPT,
                    self.encode_text_payload(partial_result),
                )
                await websocket.send_bytes(response)
                self.transcription_result += partial_result
                logger.info(f"Sent partial transcript: {partial_result}")

        except Exception as e:
            error_msg = f"Error processing audio chunk: {str(e)}"
            logger.error(error_msg, exc_info=True)
            response = self.create_binary_response(
                ActionType.ERROR, self.encode_text_payload(error_msg)
            )
            await websocket.send_bytes(response)
            self.state = ConnectionState.ERROR

    async def _handle_end_stream(self, websocket: WebSocket):
        """处理结束流式识别"""
        if (
            self.state == ConnectionState.LISTENING
            or self.state == ConnectionState.PROCESSING
        ):
            if not self.asr_engine:
                error_msg = "ASR Engine not available for ending stream"
                logger.error(error_msg)
                response = self.create_binary_response(
                    ActionType.ERROR, self.encode_text_payload(error_msg)
                )
                await websocket.send_bytes(response)
                return

            self.state = ConnectionState.PROCESSING
            logger.info("Processing end of stream...")

            # 发送流结束确认
            end_msg = "ASR stream ended"
            response = self.create_binary_response(
                ActionType.STREAM_ENDED, self.encode_text_payload(end_msg)
            )
            await websocket.send_bytes(response)
            logger.info(
                f"State changed to IDLE. Stream ended. Final transcript: '{self.transcription_result}'"
            )
            self.state = ConnectionState.IDLE
            self.transcription_result = ""
        else:
            error_msg = f"Cannot end stream in current state: {self.state.value}"
            logger.warning(error_msg)
            response = self.create_binary_response(
                ActionType.ERROR, self.encode_text_payload(error_msg)
            )
            await websocket.send_bytes(response)

    async def _handle_ping(self, websocket: WebSocket, payload: bytes):
        """处理心跳包"""
        response = self.create_binary_response(ActionType.PONG, payload)  # 回传相同的payload
        await websocket.send_bytes(response)
        logger.debug("Responded to PING with PONG")

    async def cleanup(self):
        """资源清理"""
        self.asr_engine = None
        self.state = ConnectionState.IDLE
        logger.info("ASR Engine closed and resources released.")


@router.websocket("/engine")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    asr_service = StreamingASRService()

    # 发送连接确认（使用新的struct格式）
    ack_msg = "Connection established. Initializing ASR engine..."
    ack_payload = asr_service.encode_text_payload(ack_msg)
    ack_response = asr_service.create_binary_response(
        ActionType.CONNECTION_ACK, ack_payload
    )
    await websocket.send_bytes(ack_response)

    engine_initialized = await asr_service.initialize_engine(
        engine_name="funasrStreamingEngine"
    )
    if not engine_initialized:
        error_msg = "ASR Engine failed to initialize. Please try reconnecting."
        error_payload = asr_service.encode_text_payload(error_msg)
        error_response = asr_service.create_binary_response(
            ActionType.ERROR, error_payload
        )
        await websocket.send_bytes(error_response)
        await websocket.close(code=1011)
        logger.error("WebSocket closed due to ASR engine initialization failure.")
        return

    # 发送引擎就绪消息（使用新的struct格式）
    ready_msg = "ASR Engine ready."
    ready_payload = asr_service.encode_text_payload(ready_msg)
    ready_response = asr_service.create_binary_response(
        ActionType.ENGINE_READY, ready_payload
    )
    await websocket.send_bytes(ready_response)
    logger.info("ASR Engine ready, WebSocket endpoint active.")

    try:
        while True:
            message = await websocket.receive()
            if message["type"] == "websocket.receive":
                if message.get("bytes"):
                    # 所有消息现在都是二进制格式
                    await asr_service.handle_binary_message(websocket, message["bytes"])
                elif message.get("text"):
                    # 如果收到文本消息，返回错误（协议不支持）
                    error_msg = "Text messages not supported. Use binary protocol only."
                    error_payload = asr_service.encode_text_payload(error_msg)
                    error_response = asr_service.create_binary_response(
                        ActionType.ERROR, error_payload
                    )
                    await websocket.send_bytes(error_response)
                    logger.warning("Received unsupported text message")
            elif message["type"] == "websocket.disconnect":
                logger.info(f"WebSocket disconnected by client: {message.get('code')}")
                break
    except WebSocketDisconnect:
        logger.info("Client disconnected (WebSocketDisconnect exception).")
    except Exception as e:
        logger.error(f"Unhandled error in WebSocket connection: {e}", exc_info=True)
        try:
            # 发送二进制错误响应
            error_msg = "Unexpected server error."
            error_payload = asr_service.encode_text_payload(error_msg)
            error_response = asr_service.create_binary_response(
                ActionType.ERROR, error_payload
            )
            await websocket.send_bytes(error_response)
        except Exception:
            pass
    finally:
        logger.info("Cleaning up WebSocket connection and ASR service...")
        await asr_service.cleanup()
        logger.info("Cleanup complete.")
