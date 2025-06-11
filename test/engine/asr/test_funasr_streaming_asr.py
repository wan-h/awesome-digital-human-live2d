import numpy as np
import pytest

from digitalHuman.engine.asr.funasrStreamingASR import FunasrStreamingASR
from digitalHuman.protocol import ENGINE_TYPE
from digitalHuman.utils import config


class Test_FunasrStreamingASR:
    @pytest.fixture
    def asr_engine(self):
        """创建FunasrStreamingASR引擎实例"""
        for engine_config in config.SERVER.ENGINES.ASR.SUPPORT_LIST:
            if engine_config.NAME == "funasrStreamingEngine":
                stream_asr_config = engine_config
                break
        else:
            pytest.skip("funasrStreamingEngine not found in config")

        engine = FunasrStreamingASR(config=stream_asr_config)
        try:
            engine.setup()
            yield engine
        finally:
            engine.release()

    def test_engine_initialization(self, asr_engine):
        """测试引擎初始化"""
        assert asr_engine.model is not None
        assert asr_engine.sample_rate == 16000
        assert asr_engine.chunk_size_cfg == [8, 8, 4]

    def test_start_asr_stream(self, asr_engine):
        """测试开始ASR流"""
        # 这个方法主要是重置状态，不会抛出异常即为成功
        asr_engine.start_asr_stream()

    def test_process_asr_chunk_with_real_audio(self, asr_engine, wavAudioZh):
        """测试使用真实音频文件进行流式识别"""
        # 读取音频文件
        with open(wavAudioZh, "rb") as f:
            # 跳过WAV文件头（通常是44字节）
            f.seek(44)
            audio_data = f.read()

        # 模拟流式处理：将音频分成多个块
        chunk_size_bytes = 7680 * 2  # 480ms chunks for 16kHz
        param_dict = {"cache": dict(), "is_final": False}
        c_buffer = bytearray()

        transcriptions = []

        # 分块处理音频
        for i in range(0, len(audio_data), chunk_size_bytes):
            chunk = audio_data[i : i + chunk_size_bytes]
            if not chunk:
                break

            # 判断是否为最后一个块
            is_final = i + chunk_size_bytes >= len(audio_data)
            param_dict["is_final"] = is_final

            # 处理音频块
            transcript = asr_engine.process_asr_chunk(chunk, param_dict, c_buffer)

            if transcript:
                transcriptions.append(transcript)

        # 验证结果
        assert len(transcriptions) > 0, "应该产生至少一个转录结果"

        # 合并所有转录结果
        full_transcript = "".join(transcriptions)
        assert len(full_transcript) > 0, "完整转录结果不应为空"
        assert full_transcript == "我认为跑步最重要的就是给我带来了身体健康"

    def test_process_asr_chunk_empty_audio(self, asr_engine):
        """测试处理空音频块"""
        param_dict = {"cache": dict(), "is_final": False}
        c_buffer = bytearray()

        # 测试空音频块
        empty_chunk = b""
        transcript = asr_engine.process_asr_chunk(empty_chunk, param_dict, c_buffer)

        # 空音频块应该返回空字符串
        assert transcript == ""

    def test_convert_to_numpy(self, asr_engine):
        """测试音频数据转换为numpy数组"""
        from digitalHuman.protocol import AUDIO_TYPE, AudioMessage

        # 创建测试音频数据（16位PCM）
        test_samples = np.array([1000, -1000, 2000, -2000], dtype=np.int16)
        test_bytes = test_samples.tobytes()

        audio_message = AudioMessage(
            data=test_bytes, type=AUDIO_TYPE.WAV, sampleRate=16000, sampleWidth=2
        )

        # 转换为numpy数组
        result = asr_engine._convert_to_numpy(audio_message)

        # 验证结果
        assert result is not None
        assert isinstance(result, np.ndarray)
        assert result.dtype == np.float32

        # 验证归一化是否正确
        expected = test_samples.astype(np.float32) / 32768.0
        np.testing.assert_array_almost_equal(result, expected)
