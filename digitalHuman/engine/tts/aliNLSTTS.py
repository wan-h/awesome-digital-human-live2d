import asyncio
import random
import threading
from io import BytesIO
from typing import Optional # Added for type hinting

import nls # Alibaba NLS SDK, when need to be installed

from ..builder import TTSEngines
from ..engineBase import BaseEngine
from digitalHuman.utils import logger, TextMessage, AudioMessage, AudioFormatType
from yacs.config import CfgNode as CN

__all__ = ["AliNLSTTS"]

@TTSEngines.register("AliNLSTTS")
class AliNLSTTS(BaseEngine):
    EMOTION_VOICE_SET = {"zhifeng_emo", "zhibing_emo", "zhitian_emo", "zhibei_emo", "zhiyan_emo", "zhimi_emo", "zhimiao_emo"}
    EMOTION_LIST = ['angry', 'fear', 'happy', 'hate', 'neutral', 'sad', 'surprise']

    def checkKeys(self):
        return ["URL", "TOKEN", "VOICE", "FORMAT", "SAMPLE_RATE"]

    def voice_check(self, voice: str) -> None:
        if voice not in self.EMOTION_VOICE_SET:
            raise ValueError(f"Invalid voice: {voice}. Available voices: {self.EMOTION_VOICE_SET}")

    def generate_remotion_ssml_text(self, text: str) -> str:
        return f'<speak><emotion category="{random.choice(self.EMOTION_LIST)}" intensity="1.0">{text}</emotion></speak>'

    def setup(self):
        logger.info(f"[{self.cfg.NAME}] Engine setup.")

        # Optional: Initialize any shared resources or configurations here
        # The NLS SDK's SpeechSynthesizer is typically created per request as in the example

    class NlsWorker:
        def __init__(self, text: str, config: CN):
            self._text = text
            self._config = config
            self._audio_buffer = BytesIO()
            self._completion_event = threading.Event()
            self._error_occurred = False
            self._error_message = ""

            # Configure NLS SDK debugging based on environment or config
            # nls.enableTrace(True) # Enable for debugging if needed

        def on_error(self, message, *args):
            logger.error(f"[{self._config.NAME}] On error: {message}, args: {args}")
            self._error_message = str(message)
            self._error_occurred = True
            self._completion_event.set() # Signal completion even on error

        def on_close(self, *args):
            logger.debug(f"[{self._config.NAME}] On close: args: {args}")
            self._completion_event.set() # Ensure completion is signaled

        def on_data(self, data, *args):
            if data:
                self._audio_buffer.write(data)

        def on_completed(self, message, *args):
            logger.debug(f"[{self._config.NAME}] On completed: {message}")
            self._completion_event.set()

        def synthesize(self) -> Optional[bytes]:
            tts = nls.NlsSpeechSynthesizer(
                url=self._config.URL,
                appkey=self._config.APPKEY,
                token=self._config.TOKEN,
                on_data=self.on_data,
                on_completed=self.on_completed,
                on_error=self.on_error,
                on_close=self.on_close,
                callback_args=[] 
            )

            logger.debug(f"[{self._config.NAME}] Starting TTS synthesis for text: {self._text[:50]}...")
            # The NLS SDK's start method expects parameters like voice, format, sample_rate.
            # Make sure these are correctly passed from the config.
            # The text input here is expected to be SSML.
            logger.info(f"{self._text=}")
            tts.start(
                self._text,
                voice=self._config.VOICE,
                aformat=self._config.FORMAT.lower(), # SDK expects 'pcm', 'mp3', 'wav'
                sample_rate=self._config.SAMPLE_RATE
            )

            self._completion_event.wait() # Wait for callbacks to complete

            if self._error_occurred:
                logger.error(f"[{self._config.NAME}] Synthesis failed: {self._error_message}")
                return None
            
            self._audio_buffer.seek(0)
            return self._audio_buffer.getvalue()

    async def run(self, input: TextMessage, **kwargs) -> Optional[AudioMessage]:
        logger.info(f"[{self.cfg.NAME}] Received text for TTS: {input.data[:50]}...")
        self.voice_check(self.cfg.VOICE)
        if not input.data:
            logger.warning(f"[{self.cfg.NAME}] Received empty text for TTS.")
            return None

        try:
            worker = self.NlsWorker(text=self.generate_remotion_ssml_text(input.data), config=self.cfg)
            # change to async function
            loop = asyncio.get_event_loop()

            audio_content = await loop.run_in_executor(None, worker.synthesize)
            config_audio_out_format = self.cfg.FORMAT.lower()
            if audio_content:
                if config_audio_out_format == "mp3":
                    audio_format = AudioFormatType.MP3
                elif config_audio_out_format == "wav":
                    audio_format = AudioFormatType.WAV
                else:
                    raise ValueError(f"Unsupported {config_audio_out_format} for ALI NLS tts")
                
                logger.info(f"[{self.cfg.NAME}] TTS synthesis successful. Audio size: {len(audio_content)} bytes")
                return AudioMessage(
                    data=audio_content,
                    format=audio_format,
                    sampleRate=self.cfg.SAMPLE_RATE,
                    sampleWidth=0, # This might need adjustment based on format
                    desc="Alibaba NLS TTS"
                )
            else:
                logger.error(f"[{self.cfg.NAME}] TTS synthesis failed to produce audio content.")
                return None

        except Exception as e:
            logger.error(f"[{self.cfg.NAME}] Engine run failed: {e}", exc_info=True)
            return None

