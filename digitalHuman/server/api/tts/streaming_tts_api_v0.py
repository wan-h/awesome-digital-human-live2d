import logging
import struct
from enum import Enum

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from digitalHuman.engine import EnginePool
from digitalHuman.protocol import ENGINE_TYPE, TextMessage

# 基本的日志配置
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stream_tts/v0")
engine_pool = EnginePool()

# 协议常量定义
ACTION_HEADER_SIZE = 18  # action字段大小（18字节）
DEFAULT_TEXT_CHUNK_SIZE = 1024  # 默认文本块大小
MAX_PAYLOAD_SIZE = DEFAULT_TEXT_CHUNK_SIZE * 4  # 最大payload大小

# 协议格式: [Action(18字节)] + [Payload Size(4字节)] + [Payload(可变长度)]
PROTOCOL_HEADER_FORMAT = ">18sI"  # 大端序: 18字节action + 4字节无符号整数payload_size
PROTOCOL_HEADER_SIZE = struct.calcsize(PROTOCOL_HEADER_FORMAT)  # 22字节

from loguru import logger

def _format_action(action_name: str) -> bytes:
    """格式化action名称为18字节，右侧用空格填充"""
    if len(action_name) > ACTION_HEADER_SIZE:
        raise ValueError(
            f"Action name '{action_name}' exceeds {ACTION_HEADER_SIZE} bytes"
        )
    return action_name.ljust(ACTION_HEADER_SIZE).encode("utf-8")


class ActionType:
    # 客户端请求类型
    START_STREAM = _format_action("START_STREAM")  # 开始TTS合成
    TEXT_CHUNK = _format_action("TEXT_CHUNK")  # 普通文本数据块
    END_STREAM = _format_action("END_STREAM")  # 结束TTS合成
    PING = _format_action("PING")  # 心跳包

    # 服务端响应类型
    CONNECTION_ACK = _format_action("CONNECTION_ACK")  # 连接确认
    ENGINE_READY = _format_action("ENGINE_READY")  # 引擎就绪
    STREAM_STARTED = _format_action("STREAM_STARTED")  # TTS开始确认
    AUDIO_CHUNK = _format_action("AUDIO_CHUNK")  # 音频数据块
    TTS_COMPLETED = _format_action("TTS_COMPLETED")  # TTS合成完成
    STREAM_ENDED = _format_action("STREAM_ENDED")  # 流结束确认
    ERROR = _format_action("ERROR")  # 错误信息
    PONG = _format_action("PONG")  # 心跳响应


# 定义WebSocket连接的状态
class ConnectionState(Enum):
    IDLE = "IDLE"  # 空闲状态，等待客户端指令
    INITIALIZING = "INITIALIZING"  # TTS引擎正在初始化
    PROCESSING = "PROCESSING"  # 正在处理请求
    SYNTHESIZING = "SYNTHESIZING"  # 正在合成音频
    STREAMING = "STREAMING"  # 正在流式输出音频
    COMPLETED = "COMPLETED"  # 合成完成
    ERROR = "ERROR"  # 发生错误


# 协议解析和响应创建的辅助函数
def parse_binary_message(data: bytes) -> tuple[bytes, bytes]:
    """使用struct解析二进制消息，返回(action, payload)"""
    if len(data) < PROTOCOL_HEADER_SIZE:
        raise ValueError(
            f"Message too short: {len(data)} bytes, expected at least {PROTOCOL_HEADER_SIZE}"
        )
    
    # 解析header: action(18字节) + payload_size(4字节)
    action, payload_size = struct.unpack(PROTOCOL_HEADER_FORMAT, data[:PROTOCOL_HEADER_SIZE])
    
    # 验证payload大小
    expected_total_size = PROTOCOL_HEADER_SIZE + payload_size
    if len(data) != expected_total_size:
        raise ValueError(
            f"Message size mismatch: got {len(data)} bytes, expected {expected_total_size}"
        )
    
    # 提取payload
    payload = data[PROTOCOL_HEADER_SIZE:] if payload_size > 0 else b""
    
    return action, payload


def create_binary_response(action: bytes, payload: bytes = b"") -> bytes:
    """创建二进制响应消息"""
    payload_size = len(payload)
    
    # 验证payload大小
    if payload_size > MAX_PAYLOAD_SIZE:
        raise ValueError(
            f"Payload too large: {payload_size} bytes, max allowed: {MAX_PAYLOAD_SIZE}"
        )
    
    # 打包header + payload
    header = struct.pack(PROTOCOL_HEADER_FORMAT, action, payload_size)
    return header + payload


def encode_text_payload(text: str) -> bytes:
    """将文本编码为UTF-8字节"""
    return text.encode("utf-8")


def decode_text_payload(payload: bytes) -> str:
    """将字节解码为UTF-8文本"""
    return payload.decode("utf-8")


class StreamingTTSService:
    """流式TTS服务类，负责WebSocket连接管理、状态跟踪和PiperTTS引擎集成"""

    def __init__(self):
        """初始化TTS服务"""
        self.tts_engine = None
        self.state = ConnectionState.IDLE
        self.current_text = ""
        self.audio_buffer = []
        logger.info("StreamingTTSService initialized")

    async def initialize_engine(self, engine_name: str = "piperTTSEngine") -> bool:
        """初始化TTS引擎
        
        Args:
            engine_name: TTS引擎名称
            
        Returns:
            bool: 初始化是否成功
        """
        try:
            logger.info(f"Initializing TTS engine: {engine_name}")
            self.tts_engine = engine_pool.getEngine(ENGINE_TYPE.TTS, engine_name)
            self.state = ConnectionState.IDLE  # Ready to start synthesis
            logger.info("PiperTTS engine initialized successfully.")
            return True
        except Exception as e:
            logger.error(
                f"Failed to initialize PiperTTS engine: {e}", exc_info=True
            )
            self.state = ConnectionState.ERROR
            self.tts_engine = None  # Ensure it's None if init failed
            return False

    async def handle_binary_message(self, websocket: WebSocket, data: bytes):
        """处理从客户端接收到的二进制消息"""
        try:
            action, payload = parse_binary_message(data)
            logger.info(
                f"Received action: {action} with payload size: {len(payload)} bytes"
            )

            if action == ActionType.START_STREAM:
                await self._handle_start_tts(websocket, payload)
            elif action == ActionType.TEXT_CHUNK:
                await self._handle_text_chunk(websocket, payload)

            elif action == ActionType.END_STREAM:
                await self._handle_end_tts(websocket)
            elif action == ActionType.PING:
                await self._handle_ping(websocket, payload)
            else:
                error_msg = f"Unknown action type: {action}"
                logger.warning(error_msg)
                response = create_binary_response(
                    ActionType.ERROR, encode_text_payload(error_msg)
                )
                await websocket.send_bytes(response)

        except Exception as e:
            error_msg = f"Error processing binary message: {str(e)}"
            logger.error(error_msg, exc_info=True)
            response = create_binary_response(
                ActionType.ERROR, encode_text_payload(error_msg)
            )
            await websocket.send_bytes(response)

    async def _handle_start_tts(self, websocket: WebSocket, payload: bytes):
        """处理开始TTS合成"""
        if not self.tts_engine:
            error_msg = "TTS Engine not ready"
            logger.warning(error_msg)
            response = create_binary_response(
                ActionType.ERROR, encode_text_payload(error_msg)
            )
            await websocket.send_bytes(response)
            return

        if self.state == ConnectionState.IDLE:
            self.current_text = ""
            self.audio_buffer = []
            self.state = ConnectionState.PROCESSING

            success_msg = "TTS synthesis started. Ready for text."
            response = create_binary_response(
                ActionType.STREAM_STARTED, encode_text_payload(success_msg)
            )
            await websocket.send_bytes(response)
            logger.info("State changed to PROCESSING. TTS synthesis started.")
        else:
            error_msg = f"Cannot start TTS in current state: {self.state.value}"
            logger.warning(error_msg)
            response = create_binary_response(
                ActionType.ERROR, encode_text_payload(error_msg)
            )
            await websocket.send_bytes(response)

    async def _handle_text_chunk(self, websocket: WebSocket, payload: bytes):
        """处理文本数据块"""
        if not self.tts_engine or self.state != ConnectionState.PROCESSING:
            logger.warning(
                f"Received text chunk but not in PROCESSING state or engine not ready. State: {self.state.value}. Discarding text."
            )
            return

        if len(payload) == 0:
            logger.warning("Received empty text payload")
            return

        try:
            text_chunk = decode_text_payload(payload)
            logger.debug(f"Processing text chunk: '{text_chunk}'")
            
            self.current_text += text_chunk
            
            # 使用TTS引擎合成音频
            async for audio_chunk in self.tts_engine.run_streaming(TextMessage(data=text_chunk)):
                audio_data = audio_chunk.data
                if audio_data:
                    # 使用音频流输出处理方法
                    await self.stream_audio_data(websocket, audio_data)

        except Exception as e:
            error_msg = f"Error processing text chunk: {str(e)}"
            logger.error(error_msg, exc_info=True)
            response = create_binary_response(
                ActionType.ERROR, encode_text_payload(error_msg)
            )
            await websocket.send_bytes(response)
            self.state = ConnectionState.ERROR



    async def _handle_end_tts(self, websocket: WebSocket):
        """处理结束TTS合成"""
        if self.state == ConnectionState.PROCESSING:
            if not self.tts_engine:
                error_msg = "TTS Engine not available for ending synthesis"
                logger.error(error_msg)
                response = create_binary_response(
                    ActionType.ERROR, encode_text_payload(error_msg)
                )
                await websocket.send_bytes(response)
                return

            logger.info("Processing end of TTS synthesis...")

            # 发送合成结束确认
            end_msg = "TTS synthesis ended"
            response = create_binary_response(
                ActionType.STREAM_ENDED, encode_text_payload(end_msg)
            )
            await websocket.send_bytes(response)
            logger.info(
                f"State changed to IDLE. TTS synthesis ended. Total text: '{self.current_text}'"
            )
            self.state = ConnectionState.IDLE
            self.current_text = ""
            self.audio_buffer = []
        else:
            error_msg = f"Cannot end TTS in current state: {self.state.value}"
            logger.warning(error_msg)
            response = create_binary_response(
                ActionType.ERROR, encode_text_payload(error_msg)
            )
            await websocket.send_bytes(response)

    async def _handle_ping(self, websocket: WebSocket, payload: bytes):
        """处理心跳包"""
        response = create_binary_response(ActionType.PONG, payload)  # 回传相同的payload
        await websocket.send_bytes(response)
        logger.debug("Responded to PING with PONG")

    async def stream_audio_data(self, websocket: WebSocket, audio_data: bytes):
        """流式音频数据输出处理"""
        try:
            # 引擎已经返回Float32格式数据，直接进行分块处理
            chunks = self._split_audio_data(audio_data)
            
            for chunk in chunks:
                # 发送音频数据块
                await self.send_audio_chunk(websocket, chunk)
                
                # 缓冲管理
                self.audio_buffer.append(chunk)
                
                # 背压处理：检查缓冲区大小
                await self._manage_audio_buffer()
                
        except Exception as e:
            error_msg = f"Error streaming audio data: {str(e)}"
            logger.error(error_msg, exc_info=True)
            response = create_binary_response(
                ActionType.ERROR, encode_text_payload(error_msg)
            )
            await websocket.send_bytes(response)

    async def send_audio_chunk(self, websocket: WebSocket, chunk: bytes):
        """发送单个音频数据块"""
        try:
            response = create_binary_response(ActionType.AUDIO_CHUNK, chunk)
            await websocket.send_bytes(response)
            logger.debug(f"Sent audio chunk, size: {len(chunk)} bytes")
        except Exception as e:
            logger.error(f"Failed to send audio chunk: {str(e)}", exc_info=True)
            raise


    
    def _split_audio_data(self, audio_data: bytes, chunk_size: int = 4096) -> list[bytes]:
        """将音频数据分块"""
        chunks = []
        for i in range(0, len(audio_data), chunk_size):
            chunk = audio_data[i:i + chunk_size]
            chunks.append(chunk)
        return chunks

    async def _manage_audio_buffer(self, max_buffer_size: int = 50):
        """音频缓冲管理和流控"""
        # 如果缓冲区过大，清理旧数据
        if len(self.audio_buffer) > max_buffer_size:
            # 保留最新的一半数据
            keep_size = max_buffer_size // 2
            self.audio_buffer = self.audio_buffer[-keep_size:]
            logger.debug(f"Audio buffer trimmed to {keep_size} chunks")
            
        # 可以在这里添加更多的流控逻辑
        # 例如：根据网络状况调整发送速率等

    async def cleanup(self):
        """资源清理"""
        self.tts_engine = None
        self.state = ConnectionState.IDLE
        self.current_text = ""
        self.audio_buffer = []
        logger.info("TTS Engine closed and resources released.")


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket端点，处理客户端连接、引擎初始化、消息循环和连接清理"""
    await websocket.accept()

    tts_service = StreamingTTSService()

    # 发送连接确认
    ack_msg = "Connection established. Initializing TTS engine..."
    ack_payload = encode_text_payload(ack_msg)
    ack_response = create_binary_response(ActionType.CONNECTION_ACK, ack_payload)
    await websocket.send_bytes(ack_response)

    # TTS引擎初始化
    engine_initialized = await tts_service.initialize_engine("PiperTTSImproved")
    if not engine_initialized:
        error_msg = "TTS Engine failed to initialize. Please try reconnecting."
        error_payload = encode_text_payload(error_msg)
        error_response = create_binary_response(ActionType.ERROR, error_payload)
        await websocket.send_bytes(error_response)
        await websocket.close(code=1011)
        logger.error("WebSocket closed due to TTS engine initialization failure.")
        return

    # 发送引擎就绪消息
    ready_msg = "TTS Engine ready."
    ready_payload = encode_text_payload(ready_msg)
    ready_response = create_binary_response(ActionType.ENGINE_READY, ready_payload)
    await websocket.send_bytes(ready_response)
    logger.info("TTS Engine ready, WebSocket endpoint active.")

    try:
        # 消息循环
        while True:
            message = await websocket.receive()
            if message["type"] == "websocket.receive":
                if message.get("bytes"):
                    # 处理二进制消息
                    await tts_service.handle_binary_message(websocket, message["bytes"])
                elif message.get("text"):
                    # 如果收到文本消息，返回协议错误
                    error_msg = "Text messages not supported. Use binary protocol only."
                    error_payload = encode_text_payload(error_msg)
                    error_response = create_binary_response(ActionType.ERROR, error_payload)
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
            error_payload = encode_text_payload(error_msg)
            error_response = create_binary_response(ActionType.ERROR, error_payload)
            await websocket.send_bytes(error_response)
        except Exception:
            pass
    finally:
        # 资源清理
        logger.info("Cleaning up WebSocket connection and TTS service...")
        await tts_service.cleanup()
        logger.info("Cleanup complete.")