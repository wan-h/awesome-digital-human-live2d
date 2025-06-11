#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
@File    :   test_asr_websocket_client.py
@Author  :   AI Assistant
@Time    :   2024
@Desc    :   WebSocket ASR客户端测试工具
             支持从麦克风获取音频并发送到ASR服务器进行实时语音识别
"""
import time

import asyncio
import websockets
import logging
import pyaudio
import threading
from enum import Enum
import argparse
import wave
import os
import struct

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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


# 消息类型定义（与服务器端保持一致）
class ClientMessageType(Enum):
    START_STREAM = "START_STREAM"
    AUDIO_CHUNK = "AUDIO_CHUNK"
    END_STREAM = "END_STREAM"
    PING = "PING"

class ServerMessageType(Enum):
    CONNECTION_ACK = "CONNECTION_ACK"
    ENGINE_READY = "ENGINE_READY"
    STREAM_STARTED = "STREAM_STARTED"
    PARTIAL_TRANSCRIPT = "PARTIAL_TRANSCRIPT"
    FINAL_TRANSCRIPT = "FINAL_TRANSCRIPT"
    STREAM_ENDED = "STREAM_ENDED"
    PONG = "PONG"
    ERROR = "ERROR"

class AudioRecorder:
    """音频录制器"""
    
    def __init__(self, sample_rate=16000, channels=1, chunk_size=1024, format=pyaudio.paInt16):
        self.sample_rate = sample_rate
        self.channels = channels
        self.chunk_size = chunk_size  # PyAudio读取块大小
        self.format = format
        self.audio = pyaudio.PyAudio()
        self.stream = None
        self.is_recording = False
        
        # 服务器要求的音频块大小：240ms * 16000Hz * 2字节 = 7680 * 2 = 15360字节
        self.target_chunk_size = 7680 * 2  # 15360字节
        self.audio_buffer = bytearray()  # 音频缓冲区
        
    def start_recording(self):
        """开始录音"""
        try:
            self.stream = self.audio.open(
                format=self.format,
                channels=self.channels,
                rate=self.sample_rate,
                input=True,
                frames_per_buffer=self.chunk_size
            )
            self.is_recording = True
            logger.info(f"开始录音: {self.sample_rate}Hz, {self.channels}通道, 块大小: {self.chunk_size}")
        except Exception as e:
            logger.error(f"启动录音失败: {e}")
            raise
    
    def read_audio_chunk(self):
        """读取音频块，累积到目标大小后返回"""
        if not (self.stream and self.is_recording):
            return None
            
        try:
            # 持续读取数据直到缓冲区达到目标大小
            while len(self.audio_buffer) < self.target_chunk_size and self.is_recording:
                data = self.stream.read(self.chunk_size, exception_on_overflow=False)
                if data:
                    self.audio_buffer.extend(data)
                else:
                    break
            
            # 如果缓冲区有足够的数据，返回目标大小的块
            if len(self.audio_buffer) >= self.target_chunk_size:
                chunk_data = bytes(self.audio_buffer[:self.target_chunk_size])
                self.audio_buffer = self.audio_buffer[self.target_chunk_size:]
                return chunk_data
            
            return None
        except Exception as e:
            logger.error(f"读取音频数据失败: {e}")
            return None
    
    def get_remaining_audio(self):
        """获取缓冲区中剩余的音频数据，不足时补足静音"""
        if len(self.audio_buffer) > 0:
            remaining_data = bytes(self.audio_buffer)
            self.audio_buffer.clear()
            
            # 如果剩余数据不足目标大小，用静音补足
            if len(remaining_data) < self.target_chunk_size:
                silence_needed = self.target_chunk_size - len(remaining_data)
                silence_data = b'\x00' * silence_needed  # 16位PCM静音数据
                remaining_data += silence_data
                logger.info(f"音频数据不足，补足静音: {silence_needed} 字节")
            
            return remaining_data
        return None
    
    def stop_recording(self):
        """停止录音"""
        self.is_recording = False
        if self.stream:
            self.stream.stop_stream()
            self.stream.close()
            self.stream = None
        logger.info("录音已停止")
    
    def cleanup(self):
        """清理资源"""
        self.stop_recording()
        if self.audio:
            self.audio.terminate()

class FileAudioSource:
    """文件音频源（用于测试）"""
    
    def __init__(self, file_path, chunk_size=1024):
        self.file_path = file_path
        self.chunk_size = chunk_size  # 文件读取块大小
        self.wave_file = None
        self.is_reading = False
        
        # 服务器要求的音频块大小：240ms * 16000Hz * 2字节 = 7680 * 2 = 15360字节
        self.target_chunk_size = 7680 * 2  # 15360字节
        self.audio_buffer = bytearray()  # 音频缓冲区
        
    def start_reading(self):
        """开始读取文件"""
        try:
            self.wave_file = wave.open(self.file_path, 'rb')
            self.is_reading = True
            logger.info(f"开始读取音频文件: {self.file_path}")
            logger.info(f"文件参数: {self.wave_file.getframerate()}Hz, {self.wave_file.getnchannels()}通道")
        except Exception as e:
            logger.error(f"打开音频文件失败: {e}")
            raise
    
    def read_audio_chunk(self):
        """读取音频块，累积到目标大小后返回"""
        if not (self.wave_file and self.is_reading):
            return None
            
        try:
            # 持续读取数据直到缓冲区达到目标大小
            while len(self.audio_buffer) < self.target_chunk_size and self.is_reading:
                data = self.wave_file.readframes(self.chunk_size)
                if len(data) == 0:
                    self.is_reading = False
                    break
                self.audio_buffer.extend(data)
            
            # 如果缓冲区有足够的数据，返回目标大小的块
            if len(self.audio_buffer) >= self.target_chunk_size:
                chunk_data = bytes(self.audio_buffer[:self.target_chunk_size])
                self.audio_buffer = self.audio_buffer[self.target_chunk_size:]
                return chunk_data
            
            return None
        except Exception as e:
            logger.error(f"读取音频文件数据失败: {e}")
            return None
    
    def get_remaining_audio(self):
        """获取缓冲区中剩余的音频数据，不足时补足静音"""
        if len(self.audio_buffer) > 0:
            remaining_data = bytes(self.audio_buffer)
            self.audio_buffer.clear()
            
            # 如果剩余数据不足目标大小，用静音补足
            if len(remaining_data) < self.target_chunk_size:
                silence_needed = self.target_chunk_size - len(remaining_data)
                silence_data = b'\x00' * silence_needed  # 16位PCM静音数据
                remaining_data += silence_data
                logger.info(f"音频数据不足，补足静音: {silence_needed} 字节")
            
            return remaining_data
        return None
    
    def stop_reading(self):
        """停止读取"""
        self.is_reading = False
        if self.wave_file:
            self.wave_file.close()
            self.wave_file = None
        logger.info("文件读取已停止")
    
    def cleanup(self):
        """清理资源"""
        self.stop_reading()

class ASRWebSocketClient:
    """ASR WebSocket客户端"""
    
    def __init__(self, server_url="ws://localhost:8880/adh/stream_asr/v0/engine"):
        self.server_url = server_url
        self.websocket = None
        self.audio_source = None
        self.is_streaming = False
        self.audio_thread = None
        self._main_loop = None
        self.final_transcript = ""  # 存储最终识别结果
        
    async def connect(self):
        """连接到WebSocket服务器"""
        try:
            logger.info(f"正在连接到服务器: {self.server_url}")
            self.websocket = await websockets.connect(self.server_url)
            # 保存当前事件循环的引用
            self._main_loop = asyncio.get_running_loop()
            logger.info("WebSocket连接成功")
            return True
        except Exception as e:
            logger.error(f"连接失败: {e}")
            return False
    
    async def disconnect(self):
        """断开连接"""
        if self.websocket:
            await self.websocket.close()
            self.websocket = None
            logger.info("WebSocket连接已断开")
    
    async def send_message(self, action: bytes, payload: bytes = b""):
        """发送二进制消息"""
        if not self.websocket:
            logger.error("WebSocket未连接")
            return False
        
        try:
            message = create_binary_message(action, payload)
            await self.websocket.send(message)
            logger.debug(f"发送消息: {action.decode('utf-8').strip()}")
            return True
        except Exception as e:
            logger.error(f"发送消息失败: {e}")
            return False
    
    async def send_audio_chunk(self, audio_data, is_final=False):
        """发送音频数据"""
        if not self.websocket:
            logger.error("WebSocket未连接")
            return False
        
        try:
            action = ActionType.FINAL_CHUNK if is_final else ActionType.AUDIO_CHUNK
            message = create_binary_message(action, audio_data)
            await self.websocket.send(message)
            logger.debug(f"发送音频块: {len(audio_data)} 字节 ({'最终块' if is_final else '普通块'})")
            return True
        except Exception as e:
            logger.error(f"发送音频数据失败: {e}")
            return False
    
    async def receive_messages(self):
        """接收服务器消息"""
        if not self.websocket:
            return
        
        try:
            async for message in self.websocket:
                try:
                    if isinstance(message, bytes):
                        action, payload = parse_binary_message(message)
                        await self.handle_server_message(action, payload)
                    else:
                        logger.error(f"收到非二进制消息: {message}")
                except Exception as e:
                    logger.error(f"解析消息失败: {e}")
        except websockets.exceptions.ConnectionClosed:
            logger.info("服务器连接已关闭")
        except Exception as e:
            logger.error(f"接收消息时发生错误: {e}")
    
    async def handle_server_message(self, action: bytes, payload: bytes):
        """处理服务器消息"""
        message_text = decode_text_payload(payload)
        
        if action == ActionType.CONNECTION_ACK:
            logger.info(f"服务器确认连接: {message_text}")
        elif action == ActionType.ENGINE_READY:
            logger.info(f"ASR引擎就绪: {message_text}")
        elif action == ActionType.STREAM_STARTED:
            logger.info(f"音频流已开始: {message_text}")
        elif action == ActionType.PARTIAL_TRANSCRIPT:
            logger.info(f"部分识别结果: {message_text}")
        elif action == ActionType.FINAL_TRANSCRIPT:
            logger.info(f"最终识别结果: {message_text}" + str(time.time()))
            self.final_transcript = message_text  # 保存最终识别结果
        elif action == ActionType.STREAM_ENDED:
            logger.info(f"音频流已结束: {message_text}")
        elif action == ActionType.PONG:
            logger.debug("收到PONG响应")
        elif action == ActionType.ERROR:
            logger.error(f"服务器错误: {message_text}")
        else:
            action_name = action.decode('utf-8').strip()
            logger.warning(f"未知消息类型: {action_name}")
    
    def audio_streaming_thread(self):
        """音频流发送线程"""
        logger.info("音频流线程启动")
        
        # 获取主事件循环
        loop = self._main_loop
        
        while self.is_streaming and self.audio_source:
            audio_data = self.audio_source.read_audio_chunk()
            if audio_data is None:
                logger.info("音频数据读取完毕")
                break
            
            # 在主事件循环中发送音频数据
            if loop and not loop.is_closed():
                future = asyncio.run_coroutine_threadsafe(
                    self.send_audio_chunk(audio_data),
                    loop
                )
                try:
                    future.result(timeout=1.0)  # 等待发送完成，设置超时
                except Exception as e:
                    logger.error(f"发送音频数据失败: {e}")

            # 控制发送频率 - 每个块对应240ms音频
            time.sleep(0.24)  # 240ms间隔，与音频块时长匹配
        
        logger.info("音频流线程结束")
    
    async def start_audio_stream(self, audio_source):
        """开始音频流"""
        self.audio_source = audio_source
        
        # 发送开始流消息
        if not await self.send_message(ActionType.START_STREAM):
            return False
        
        # 等待一下确保服务器准备好
        await asyncio.sleep(0.1)
        
        # 启动音频源
        if hasattr(audio_source, 'start_recording'):
            audio_source.start_recording()
        elif hasattr(audio_source, 'start_reading'):
            audio_source.start_reading()
        
        # 启动音频流线程
        self.is_streaming = True
        self.audio_thread = threading.Thread(target=self.audio_streaming_thread)
        self.audio_thread.start()
        
        logger.info("音频流已启动")
        return True
    
    async def stop_audio_stream(self):
        """停止音频流"""
        self.is_streaming = False
        
        # 等待音频线程结束
        if self.audio_thread:
            self.audio_thread.join(timeout=5)
            self.audio_thread = None
        
        # 发送剩余的音频数据作为最终块
        if self.audio_source and hasattr(self.audio_source, 'get_remaining_audio'):
            remaining_audio = self.audio_source.get_remaining_audio()
            if remaining_audio and len(remaining_audio) > 0:
                logger.info(f"发送剩余音频数据: {len(remaining_audio)} 字节")
                await self.send_audio_chunk(remaining_audio, is_final=True)
        
        # 停止音频源
        if self.audio_source:
            if hasattr(self.audio_source, 'stop_recording'):
                self.audio_source.stop_recording()
            elif hasattr(self.audio_source, 'stop_reading'):
                self.audio_source.stop_reading()
        
        # 发送结束流消息
        await self.send_message(ActionType.END_STREAM)
        
        logger.info("音频流已停止")
    
    async def ping(self, payload: str = "test_ping"):
        """发送PING消息"""
        return await self.send_message(ActionType.PING, encode_text_payload(payload))

async def test_microphone_streaming(server_url, duration=10):
    """测试麦克风音频流"""
    client = ASRWebSocketClient(server_url)
    recorder = AudioRecorder()
    
    try:
        # 连接到服务器
        if not await client.connect():
            return
        
        # 启动消息接收
        receive_task = asyncio.create_task(client.receive_messages())
        
        # 等待服务器初始化
        await asyncio.sleep(2)
        
        # 开始音频流
        await client.start_audio_stream(recorder)
        
        # 录制指定时长
        logger.info(f"开始录制 {duration} 秒...")
        await asyncio.sleep(duration)
        
        # 停止音频流
        await client.stop_audio_stream()
        
        # 等待一下让服务器处理完最后的音频
        await asyncio.sleep(2)
        
        # 取消接收任务
        receive_task.cancel()
        
    except Exception as e:
        logger.error(f"测试过程中发生错误: {e}")
    finally:
        recorder.cleanup()
        await client.disconnect()

async def test_file_streaming(server_url, audio_file):
    """测试音频文件流"""
    if not os.path.exists(audio_file):
        logger.error(f"音频文件不存在: {audio_file}")
        return
    
    client = ASRWebSocketClient(server_url)
    file_source = FileAudioSource(audio_file)
    
    try:
        # 连接到服务器
        if not await client.connect():
            return
        
        # 启动消息接收
        receive_task = asyncio.create_task(client.receive_messages())
        
        # 等待服务器初始化
        await asyncio.sleep(2)
        
        # 开始音频流
        await client.start_audio_stream(file_source)
        
        # 等待文件播放完毕
        while file_source.is_reading:
            await asyncio.sleep(0.1)
        
        # 停止音频流
        await client.stop_audio_stream()
        
        # 等待一下让服务器处理完最后的音频
        await asyncio.sleep(2)
        
        # 取消接收任务
        receive_task.cancel()
        
    except Exception as e:
        logger.error(f"测试过程中发生错误: {e}")
    finally:
        file_source.cleanup()
        await client.disconnect()

async def get_user_input():
    """异步获取用户输入"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, input, "\n请输入命令 (start/stop/quit): ")

async def test_interactive_streaming(server_url):
    """交互式测试模式 - 手动控制音频流开始和停止"""
    client = ASRWebSocketClient(server_url)
    recorder = AudioRecorder()
    
    try:
        # 连接到服务器
        if not await client.connect():
            return
        
        # 启动消息接收
        receive_task = asyncio.create_task(client.receive_messages())
        
        # 等待服务器初始化
        await asyncio.sleep(2)
        
        print("\n=== 交互式ASR测试模式 ===")
        print("命令说明:")
        print("  start - 开始录音和语音识别")
        print("  stop  - 停止录音和语音识别")
        print("  quit  - 退出程序")
        print("\n可以多次使用 start/stop 命令")
        print("提示: 按 Ctrl+C 可以快速退出")
        
        is_streaming = False
        
        while True:
            try:
                # 异步获取用户输入
                command = await get_user_input()
                command = command.strip().lower()
                
                if command == "quit" or command == "q":
                    print("退出程序...")
                    break
                elif command == "start" or command == "s":
                    if is_streaming:
                        print("音频流已经在运行中")
                        continue
                    
                    print("开始录音和语音识别...")
                    await client.start_audio_stream(recorder)
                    is_streaming = True
                    print("音频流已启动，说话试试吧！")
                    
                elif command == "stop" or command == "t":
                    if not is_streaming:
                        print("音频流未在运行")
                        continue
                    
                    print("停止录音和语音识别..." +  str(time.time()))
                    
                    await client.stop_audio_stream()
                    # 等待服务器处理最终音频并返回结果
                    await asyncio.sleep(1)
                    is_streaming = False
                    print("音频流已停止")
                    
                    # 打印最终识别结果
                    if client.final_transcript:
                        print("\n=== 最终识别结果 ===")
                        print(client.final_transcript)
                        print("=" * 20)
                    else:
                        print("未获取到识别结果")
                    
                elif command == "help" or command == "h":
                    print("\n命令说明:")
                    print("  start/s - 开始录音和语音识别")
                    print("  stop/t  - 停止录音和语音识别")
                    print("  quit/q  - 退出程序")
                    print("  help/h  - 显示帮助信息")
                    
                else:
                    print("无效命令，请输入 start、stop、quit 或 help (可使用简写 s/t/q/h)")
                    
            except KeyboardInterrupt:
                print("\n检测到 Ctrl+C，退出程序...")
                break
            except EOFError:
                print("\n输入结束，退出程序...")
                break
            except Exception as e:
                logger.error(f"处理用户输入时发生错误: {e}")
                continue
        
        # 确保停止音频流
        if is_streaming:
            print("正在停止音频流...")
            await client.stop_audio_stream()
        
        # 取消接收任务
        if not receive_task.done():
            receive_task.cancel()
            try:
                await receive_task
            except asyncio.CancelledError:
                pass
        
    except Exception as e:
        logger.error(f"测试过程中发生错误: {e}")
    finally:
        recorder.cleanup()
        await client.disconnect()
        print("程序已退出")

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="ASR WebSocket客户端测试工具")
    parser.add_argument("--server", default="ws://localhost:8880/adh/stream_asr/v0/engine",
                       help="WebSocket服务器地址")
    parser.add_argument("--mode", choices=["mic", "file", "interactive"], default="interactive",
                       help="测试模式: mic(麦克风定时) 或 file(文件) 或 interactive(交互式)")
    parser.add_argument("--duration", type=int, default=10,
                       help="麦克风录制时长(秒)")
    parser.add_argument("--file", help="音频文件路径(WAV格式)")
    parser.add_argument("--verbose", action="store_true", help="详细日志")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    if args.mode == "mic":
        logger.info("启动麦克风测试模式")
        asyncio.run(test_microphone_streaming(args.server, args.duration))
    elif args.mode == "file":
        if not args.file:
            logger.error("文件模式需要指定 --file 参数")
            return
        logger.info(f"启动文件测试模式: {args.file}")
        asyncio.run(test_file_streaming(args.server, args.file))
    elif args.mode == "interactive":
        logger.info("启动交互式测试模式")
        asyncio.run(test_interactive_streaming(args.server))

if __name__ == "__main__":
    main()