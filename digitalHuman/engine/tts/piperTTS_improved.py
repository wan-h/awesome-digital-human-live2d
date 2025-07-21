import base64
import io
import wave
from typing import List, AsyncGenerator, Optional
from pathlib import Path

from digitalHuman.utils import logger
from digitalHuman.protocol import TextMessage, AudioMessage, VoiceDesc, GENDER_TYPE, ParamDesc, PARAM_TYPE
from ..builder import TTSEngines
from ..engineBase import BaseTTSEngine
from ...utils.env import MODEL_ROOT_PATH
from pydub import AudioSegment

try:
    from piper import PiperVoice
    from piper.config import SynthesisConfig
    PIPER_AVAILABLE = True
    DEFAULT_CONFIG_DICT = dict(
        length_scale=1.0,
        noise_scale=0.667,
        noise_w_scale=0.8,
    )
except ImportError:
    PIPER_AVAILABLE = False
    PiperVoice = None
    logger.warning("Piper TTS not available. Install with: pip install piper-tts")




@TTSEngines.register("PiperTTSImproved")
class PiperTTSImproved(BaseTTSEngine):
    """
    优化的中文Piper TTS引擎，使用Python API替代subprocess
    专注于中文语音合成，提供更好的性能和流式处理能力
    """
    
    def __init__(self, config, engine_type):
        super().__init__(config, engine_type)
        
        if not PIPER_AVAILABLE:
            raise ImportError("Piper TTS is not available. Please install with: pip install piper-tts")
        
        self.voice: Optional[PiperVoice] = None
        self.model_path = None
        self.config_path = None
        self.use_cuda = False
        self._voice_cache = {}  # Cache for loaded voices
        
        # 使用配置中指定的默认中文模型进行初始化
        default_model = getattr(config, 'default_model', 'zh_CN-huayan-medium')
        if default_model:
            self._load_voice(default_model)
    
    def _load_voice(self, model_name: str, use_cuda: bool = False) -> PiperVoice:
        """
        加载中文Piper语音模型并缓存
        
        Args:
            model_name: 中文模型名称或路径
            use_cuda: 是否使用CUDA加速
            
        Returns:
            已加载的PiperVoice实例
        """
        cache_key = f"{model_name}_{use_cuda}"
        
        if cache_key in self._voice_cache:
            return self._voice_cache[cache_key]
        
        try:
            # 尝试加载中文模型路径
            model_path = Path(f"{MODEL_ROOT_PATH}/piper/{model_name}.onnx")
            if model_path.exists():
                voice = PiperVoice.load(model_path, use_cuda=use_cuda)
            else:
                # 如果找不到模型文件，抛出错误
                raise FileNotFoundError(f"中文模型未找到: {model_name}")
            
            self._voice_cache[cache_key] = voice
            logger.info(f"[PiperTTSImproved] 成功加载中文语音模型: {model_name}")
            return voice
            
        except Exception as e:
            logger.error(f"[PiperTTSImproved] 加载中文语音模型失败 {model_name}: {e}")
            raise
    
    async def voices(self, **kwargs) -> List[VoiceDesc]:
        """
        Return available Chinese voices for Piper TTS
        """
        return [
            VoiceDesc(name="zh_CN-huayan-medium", gender=GENDER_TYPE.FEMALE),
        ]
    
    def parameters(self) -> List[ParamDesc]:
        """
        Return configurable parameters for Chinese Piper TTS
        """
        return [
            ParamDesc(
                name="voice",
                description="中文语音模型",
                type=PARAM_TYPE.STRING,
                required=False,
                choices=["zh_CN-huayan-medium"],
                default="zh_CN-huayan-medium"
            )
        ]
    
    async def run(self, input: TextMessage, **kwargs) -> AudioMessage:
        """
        中文TTS合成 (非流式)
        
        Args:
            input: 要合成的文本消息
            **kwargs: 合成参数
            
        Returns:
            包含合成音频的AudioMessage
        """
        # 提取参数
        voice_name = kwargs.get("voice", "zh_CN-huayan-medium")
        speed = kwargs.get("speed", 1.0)

        logger.debug(f"[PiperTTSImproved] 正在合成中文文本: {input.data[:100]}...")
        
        try:
            # 加载中文语音模型
            voice = self._load_voice(voice_name, use_cuda=False)

            # 准备合成参数
            synthesis_args = {
                **DEFAULT_CONFIG_DICT,
                "length_scale": speed,  # 使用speed参数控制语速
            }

            # 过滤None值
            synthesis_args = {k: v for k, v in synthesis_args.items() if v is not None}

            # Synthesize using Python API
            with io.BytesIO() as wav_io:
                with wave.open(wav_io, "wb") as wav_file:
                    voice.synthesize_wav(input.data, wav_file, SynthesisConfig(**synthesis_args))
                
                audio_data = wav_io.getvalue()
            

            # 重采样到16000Hz
            resampled_audio_data = self._resample_audio(audio_data, 22050, 16000)
            audio_b64 = base64.b64encode(resampled_audio_data).decode('utf-8')
            
            return AudioMessage(
                data=audio_b64,
                sampleRate=16000,
                sampleWidth=2
            )
            
        except Exception as e:
            logger.error(f"[PiperTTSImproved] 中文合成失败: {e}")
            raise RuntimeError(f"[PiperTTSImproved] 中文合成失败: {e}")
    
    async def stream_synthesis(self, text: str) -> AsyncGenerator[bytes, None]:
        """
        中文流式TTS合成
        
        Args:
            text: 要合成的中文文本

        Yields:
            音频数据块
        """
        logger.debug(f"[PiperTTSImproved] 开始中文流式合成")
        
        # 加载中文语音模型
        voice = self._load_voice("zh_CN-huayan-medium", use_cuda=False)



        try:
            logger.debug(f"[PiperTTSImproved] 正在合成: {text[:50]}...")

            # 使用Python API合成句子
            for audio_chunk in voice.synthesize(text, SynthesisConfig(**DEFAULT_CONFIG_DICT)):
                logger.debug(f"[PiperTTSImproved] 正在返回chunk size {len(audio_chunk.audio_int16_bytes)}")
                # 重采样音频块从22050Hz到16000Hz
                resampled_chunk = self._resample_audio_chunk(audio_chunk.audio_int16_bytes, 22050, 16000)
                # 在引擎侧进行PCM到Float32转换
                float32_chunk = self._convert_pcm_to_float32(resampled_chunk)
                yield float32_chunk

        except Exception as e:
            logger.error(f"[PiperTTSImproved] 中文流式合成失败: {e}")
            raise
    
    async def run_streaming(self, input: TextMessage) -> AsyncGenerator[AudioMessage, None]:
        """
        中文流式TTS合成方法
        
        Args:
            input: 要合成的中文文本消息
        Yields:
            AudioMessage音频消息块
        """
        logger.debug(f"[PiperTTSImproved] 开始中文流式TTS: {input.data[:50]}...")
        
        try:
            async for audio_chunk in self.stream_synthesis(input.data):

                yield AudioMessage(
                    data=audio_chunk,
                    sampleRate=16000,
                    sampleWidth=4  # Float32格式每个样本4字节
                )

        except Exception as e:
            logger.error(f"[PiperTTSImproved] 中文流式TTS失败: {e}")
            raise
    
    def _resample_audio(self, audio_data: bytes, original_rate: int, target_rate: int) -> bytes:
        """
        重采样音频数据
        
        Args:
            audio_data: 原始音频数据 (WAV格式)
            original_rate: 原始采样率
            target_rate: 目标采样率
            
        Returns:
            重采样后的音频数据 (WAV格式)
        """
        try:
            # 使用pydub加载音频数据
            audio_segment = AudioSegment.from_wav(io.BytesIO(audio_data))
            
            # 重采样到目标采样率
            resampled_audio = audio_segment.set_frame_rate(target_rate)
            
            # 导出为WAV格式
            output_buffer = io.BytesIO()
            resampled_audio.export(output_buffer, format="wav")
            
            return output_buffer.getvalue()
            
        except Exception as e:
            logger.error(f"[PiperTTSImproved] 音频重采样失败: {e}")
            raise
    
    def _resample_audio_chunk(self, audio_chunk: bytes, original_rate: int, target_rate: int) -> bytes:
        """
        重采样音频块数据 (16位PCM格式)
        
        Args:
            audio_chunk: 原始音频块数据 (16位PCM)
            original_rate: 原始采样率
            target_rate: 目标采样率
            
        Returns:
            重采样后的音频块数据 (16位PCM)
        """
        try:
            # 将16位PCM数据转换为AudioSegment
            audio_segment = AudioSegment(
                data=audio_chunk,
                sample_width=2,  # 16位 = 2字节
                frame_rate=original_rate,
                channels=1
            )
            
            # 重采样到目标采样率
            resampled_audio = audio_segment.set_frame_rate(target_rate)
            
            # 返回原始PCM数据
            return resampled_audio.raw_data
            
        except Exception as e:
            logger.error(f"[PiperTTSImproved] 音频块重采样失败: {e}")
            raise
    
    def _convert_pcm_to_float32(self, pcm_data: bytes) -> bytes:
        """
        将16位PCM数据转换为Float32格式
        
        Args:
            pcm_data: 16位PCM音频数据
            
        Returns:
            Float32格式的音频数据
        """
        import struct
        
        try:
            # 确保数据长度是偶数（16位PCM每个样本2字节）
            if len(pcm_data) % 2 != 0:
                logger.warning(f"[PiperTTSImproved] PCM数据长度 {len(pcm_data)} 不是偶数，截断最后一个字节")
                pcm_data = pcm_data[:-1]
            
            # 将16位PCM转换为Float32
            samples = len(pcm_data) // 2
            float32_samples = []
            
            for i in range(samples):
                # 读取16位有符号整数（小端序）
                sample_bytes = pcm_data[i*2:(i+1)*2]
                sample = struct.unpack('<h', sample_bytes)[0]  # 16位有符号整数
                
                # 转换为Float32 (-1.0 到 1.0)
                if sample < 0:
                    float_sample = sample / 32768.0
                else:
                    float_sample = sample / 32767.0
                
                float32_samples.append(float_sample)
            
            # 将Float32数组转换为字节数据
            float32_bytes = struct.pack(f'<{len(float32_samples)}f', *float32_samples)
            
            logger.debug(f"[PiperTTSImproved] 转换 {len(pcm_data)} 字节PCM为 {len(float32_bytes)} 字节Float32")
            return float32_bytes
            
        except Exception as e:
            logger.error(f"[PiperTTSImproved] PCM到Float32转换失败: {e}")
            raise
    
    def get_voice_info(self, voice_name: str = None) -> dict:
        """
        获取中文语音模型信息
        
        Args:
            voice_name: 中文语音模型名称 (可选)
            
        Returns:
            语音信息字典
        """
        if voice_name:
            try:
                voice = self._load_voice(voice_name)
                return {
                    "name": voice_name,
                    "sample_rate": 16000,
                    "num_speakers": getattr(voice, 'num_speakers', 1),
                    "loaded": True,
                    "language": "中文"
                }
            except Exception as e:
                return {
                    "name": voice_name,
                    "error": str(e),
                    "loaded": False
                }
        else:
            return {
                "cached_voices": list(self._voice_cache.keys()),
                "piper_available": PIPER_AVAILABLE,
                "supported_language": "中文"
            }
    
    def __del__(self):
        """清理缓存的中文语音模型"""
        if hasattr(self, '_voice_cache'):
            for voice in self._voice_cache.values():
                try:
                    del voice
                except:
                    pass
            self._voice_cache.clear()