import asyncio
import os
import pytest

from digitalHuman.utils.configParser import config
from digitalHuman.engine.tts.ttsFactory import TTSFactory
from digitalHuman.utils.protocol import TextMessage, AudioMessage
from digitalHuman.utils import logger

# 配置日志
@pytest.fixture(scope="module")
def setup_logger():
    logger.getLogger().setLevel(logger.DEBUG)
    handler = logger.StreamHandler()
    handler.setFormatter(logger.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logger.getLogger().addHandler(handler)

# 加载配置文件路径
@pytest.fixture(scope="module")
def tts_config_file():
    config_dir = "configs"
    tts_config_file = os.path.join(config_dir, "engines", "tts", "aliNLS.yaml")
    if not os.path.exists(tts_config_file):
        pytest.fail(f"TTS config file not found: {tts_config_file}")
    return tts_config_file

# 创建 TTS 引擎
@pytest.fixture(scope="module")
def event_loop():
    loop = asyncio.get_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="module")
async def tts_engine(tts_config_file):
    try:
        for cn in config.SERVER.ENGINES.TTS.SUPPORT_LIST:
            if cn.NAME == "AliNLSTTS":
                tts_engine_cfg_node = cn
                break
        else:
            pytest.fail("No TTS engine found in config file.")

        if "YOUR_APPKEY" in tts_engine_cfg_node.APPKEY or "YOUR_TOKEN" in tts_engine_cfg_node.TOKEN:
            pytest.skip("Placeholder APPKEY or TOKEN found in aliNLS.yaml. Please update with real credentials.")

        engine = TTSFactory.create(tts_engine_cfg_node)
        logger.info(f"Successfully created TTS engine: {engine.name}")
        return engine
    except Exception as e:
        pytest.fail(f"Error creating TTS engine: {e}")
# 实际测试逻辑
@pytest.mark.asyncio
async def test_ali_nls_tts(tts_engine):
    ssml_text = '<speak><emotion category="happy" intensity="1.0">今天天气真好，阳光明媚！</emotion></speak>'
    output_filename = "test_output_happy.pcm"

    text_message = TextMessage(data=ssml_text)

    try:
        audio_message: AudioMessage = await tts_engine.run(text_message)

        assert audio_message is not None, "TTS 返回为空"
        assert audio_message.data is not None and len(audio_message.data) > 0, "音频数据为空"

        os.makedirs("outputs", exist_ok=True)
        output_path = os.path.join("outputs", output_filename)
        with open(output_path, "wb") as f:
            f.write(audio_message.data)

        logger.info(f"音频保存成功: {output_path}")
        logger.info(f"音频格式: {audio_message.format}, 采样率: {audio_message.sampleRate}")

    except Exception as e:
        pytest.fail(f"TTS 合成过程中发生错误: {e}")
