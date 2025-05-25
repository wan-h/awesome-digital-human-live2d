import logging
from yacs.config import CfgNode as CN

from digitalHuman.engine.builder import ASREngines
import numpy as np

try:
    from funasr_onnx.paraformer_online_bin import Paraformer
except ImportError:
    Paraformer = None 
    logging.warning("funasr_onnx.paraformer_online_bin not found. FunasrStreamingASR will not be fully functional.")

from modelscope import snapshot_download

from digitalHuman.engine.engineBase import AsyncStreamEngine
from digitalHuman.utils.protocol import AudioMessage, TextMessage, AudioFormatType

# 基本的日志配置
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@ASREngines.register("funasr_streaming_engine")
class FunasrStreamingASR(AsyncStreamEngine):
    '''
    Funasr Streaming ASR Engine.
    使用 FunASR ONNX Paraformer 模型进行流式语音识别。
    '''
    def __init__(
            self,
            config: CN
    ):
        self.model_name = config.MODEL_NAME
        self.model_revision = "v2.0.5"
        self.chunk_size_cfg = [8, 8, 4] # This is FunASR's specific chunk_size parameter for the model

        self.model_dir = None
        self.model = None
        self.sample_rate = 16000 # Expected sample rate
        super().__init__(config=config)
        logger.info(f"FunasrStreamingASR initialized with model: {self.model_name}, chunk_size_cfg: {self.chunk_size_cfg}")

    def setup(self):
        '''
        初始化引擎，下载并加载模型。
        Initialize the engine, download and load the model.
        '''
        if not Paraformer:
            logger.error("Paraformer model could not be imported. FunasrStreamingASR cannot be initialized.")
            raise RuntimeError("Paraformer model not available.")

        try:
            logger.info(f"Downloading Funasr model: {self.model_name} revision: {self.model_revision}")
            self.model_dir = snapshot_download(self.model_name, revision=self.model_revision)
            logger.info(f"Model downloaded to: {self.model_dir}")

            # intra_op_num_threads can be configured via kwargs if needed
            self.model = Paraformer(self.model_dir, batch_size=1, quantize=True, chunk_size=self.chunk_size_cfg, intra_op_num_threads=4) # only support batch_size = 1
            logger.info("Funasr Paraformer model loaded successfully.")
        except Exception as e:
            import traceback
            traceback.print_exc()
            logger.error(f"Failed to initialize Funasr model: {e}", exc_info=True)
            raise RuntimeError(f"Funasr model initialization failed: {e}")

    def start_asr_stream(self):
        """
        开始一个新的识别会话。
        Starts a new recognition session.
        """
        logger.info("ASR session started, cache and buffer reset.")

    async def run(self, audio_message: AudioMessage, **kwargs) -> TextMessage:
        '''
        不支持
        '''
        logger.warning("Non-streaming 'run' method called on FunasrStreamingASR. This engine is designed for chunk-based processing via 'process_chunk'.")
        raise NotImplementedError("Non-streaming 'run' method not implemented for FunasrStreamingASR.")

    def _convert_to_numpy(self, audio_message: AudioMessage):
        '''
        将 AudioMessage 转换为 NumPy 数组。
        Converts AudioMessage to a NumPy array.
        Requires soundfile to be installed.
        '''
        # Funasr Paraformer expects a NumPy array of shape (N,) for audio samples.
        # The audio data is expected to be 16kHz, mono.
        # AudioMessage.data is bytes. We need to convert it.
        # Assuming PCM 16-bit signed mono audio.

        if audio_message.format != AudioFormatType.WAV:
            logger.error(f"Unsupported audio format: {audio_message.format}. Expected PCM.")
            # Potentially convert here if other formats are supported by adding soundfile.read
            # For now, strictly PCM as per typical ASR streaming.
            return None
        
        if audio_message.sampleRate != self.sample_rate:
            logger.error(f"Unsupported sample rate: {audio_message.sampleRate}. Expected {self.sample_rate} Hz.")
            # Resampling would be needed here. For now, error out.
            return None

        # Convert bytes to numpy array (int16)
        try:
            audio_array = np.frombuffer(audio_message.data, dtype=np.int16)
            speech_array = audio_array.astype(np.float32) / 32768.0
            return speech_array
        except Exception as e:
            logger.error(f"Error converting audio data to numpy array: {e}", exc_info=True)
            return None


    def process_asr_chunk(self, audio_chunk: bytes, param_dict: dict, current_buffer: bytearray) -> str:
        """
        处理一个音频数据块（bytes）。
        Processes a chunk of audio data (bytes).

        Args:
            audio_chunk (bytes): The raw audio data chunk.
            param_dict (dict) : the model context
            current_buffer (bytearray): the buffer size
        Returns:
            str: The partial or final transcription result for this chunk.
        """
        if not self.model:
            # This should ideally be handled by calling init() before starting any processing.
            # However, as a fallback:
            logger.warning("Model not initialized. Attempting to initialize now.")
            # Raising an error might be better in a production system if init() is expected earlier.
            raise RuntimeError("FunasrStreamingASR model not initialized before process_chunk call.")

        current_buffer.extend(audio_chunk)
        logger.debug(f"Added {len(audio_chunk)} bytes to buffer. Buffer size: {len(current_buffer)} bytes.")

        transcription = ""
        
        try:
            # Convert just the incoming chunk for now.
            # The example code's loop suggests the model internally manages history via `param_dict['cache']`.
            audio_message_for_conversion = AudioMessage(data=audio_chunk, format=AudioFormatType.WAV, sampleRate=self.sample_rate, sampleWidth=2)
            speech_data_np = self._convert_to_numpy(audio_message_for_conversion)

            if speech_data_np is not None and speech_data_np.size > 0:
                logger.debug(f"Processing chunk with is_final: {param_dict.get('is_final')}. Cache state before: {param_dict.get('cache', {}).keys()}")
                
                rec_result = self.model(audio_in=speech_data_np, param_dict=param_dict)
                
                logger.debug(f"Model raw result: {rec_result}")
                if rec_result and len(rec_result) > 0 and "preds" in rec_result[0] and len(rec_result[0]["preds"]) > 0:
                    chunk_transcription = rec_result[0]["preds"][0]
                    if chunk_transcription: # Only append if there's actual text
                        transcription = chunk_transcription
                        logger.info(f"Chunk transcription: '{transcription}'")
                # The cache in param_dict is updated by the model instance itself.
            else:
                logger.debug("Empty or invalid audio data after conversion, skipping model inference for this chunk.")

        except Exception as e:
            logger.error(f"Error during ASR chunk processing: {e}", exc_info=True)
            # Decide if we should reset cache or try to continue
            # self.param_dict = {'cache': dict()} # Potentially reset cache on error

        if param_dict.get('is_final'):
            logger.info("Final chunk processed. Resetting ASR session state for next stream.")
            self.start_asr_stream() # Reset cache and buffer for the next independent stream

        return transcription

    def end_asr_stream(self) -> None:
        '''
        结束当前识别会话
        Ends the current recognition session
        '''
        logger.info("ASR session ending.")

    def release(self):
        """
        释放资源。
        Release resources.
        """
        self.model = None
        logger.info("FunasrStreamingASR engine closed and resources released.")


