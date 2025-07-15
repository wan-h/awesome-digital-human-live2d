# -*- coding: utf-8 -*-
'''
@File    :   edgeTTS.py
@Author  :   一力辉 
'''


from ..builder import TTSEngines
from ..engineBase import BaseTTSEngine
import edge_tts
import base64
from typing import List
from digitalHuman.protocol import *
from digitalHuman.utils import logger, mp3ToWav

__all__ = ["EdgeApiTts"]

VOICE_LIST = [
    VoiceDesc(name="zh-HK-HiuGaaiNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="zh-HK-HiuMaanNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="zh-HK-WanLungNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="zh-CN-XiaoxiaoNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="zh-CN-XiaoyiNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="zh-CN-YunjianNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="zh-CN-YunxiNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="zh-CN-YunxiaNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="zh-CN-YunyangNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="zh-CN-liaoning-XiaobeiNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="zh-TW-HsiaoChenNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="zh-TW-YunJheNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="zh-TW-HsiaoYuNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="zh-CN-shaanxi-XiaoniNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-AU-NatashaNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-AU-WilliamNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="en-CA-ClaraNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-CA-LiamNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="en-HK-YanNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-HK-SamNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="en-IN-NeerjaExpressiveNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-IN-NeerjaNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-IN-PrabhatNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="en-IE-ConnorNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="en-IE-EmilyNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-KE-AsiliaNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-KE-ChilembaNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="en-NZ-MitchellNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="en-NZ-MollyNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-NG-AbeoNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="en-NG-EzinneNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-PH-JamesNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="en-PH-RosaNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-US-AvaNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-US-AndrewNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="en-US-EmmaNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-US-BrianNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="en-SG-LunaNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-SG-WayneNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="en-ZA-LeahNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-ZA-LukeNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="en-TZ-ElimuNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="en-TZ-ImaniNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-GB-LibbyNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-GB-MaisieNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-GB-RyanNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="en-GB-SoniaNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-GB-ThomasNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="en-US-AnaNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-US-AndrewMultilingualNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="en-US-AriaNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-US-AvaMultilingualNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-US-BrianMultilingualNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="en-US-ChristopherNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="en-US-EmmaMultilingualNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-US-EricNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="en-US-GuyNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="en-US-JennyNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-US-MichelleNeural", gender=GENDER_TYPE.FEMALE),
    VoiceDesc(name="en-US-RogerNeural", gender=GENDER_TYPE.MALE),
    VoiceDesc(name="en-US-SteffanNeural", gender=GENDER_TYPE.MALE)
]
@TTSEngines.register("EdgeTTS")
class EdgeApiTts(BaseTTSEngine):
    async def voices(self, **kwargs) -> List[VoiceDesc]:
        return VOICE_LIST
        """
        结构体
        [{
            'Name': 'Microsoft Server Speech Text to Speech Voice (af-ZA, AdriNeural)', 
            'ShortName': 'af-ZA-AdriNeural', 
            'Gender': 'Female', 
            'Locale': 'af-ZA', 
            'SuggestedCodec': 'audio-24khz-48kbitrate-mono-mp3', 
            'FriendlyName': 'Microsoft Adri Online (Natural) - Afrikaans (South Africa)', 
            'Status': 'GA', 
            'VoiceTag': {'ContentCategories': ['General'], 'VoicePersonalities': ['Friendly', 'Positive']
        }, ...]
        """
        voices = await edge_tts.list_voices()
        # 过滤 zh / en
        voices = [voice for voice in voices if voice['ShortName'].startswith('zh') or voice['ShortName'].startswith('en')]
        test = [VoiceDesc(name=voice['ShortName'], gender=GENDER_TYPE.FEMALE if voice['Gender'] == 'Female' else GENDER_TYPE.MALE) for voice in voices]
        for t in test:
            print(f'VoiceDesc(name="{t.name}", gender={"GENDER_TYPE.FEMALE" if t.gender == GENDER_TYPE.FEMALE else "GENDER_TYPE.MALE"}),')
        return [VoiceDesc(name=voice['ShortName'], gender=GENDER_TYPE.FEMALE if voice['Gender'] == 'Female' else GENDER_TYPE.MALE) for voice in voices]

    async def run(self, input: TextMessage, **kwargs) -> AudioMessage:
        # 参数填充
        for paramter in self.parameters():
            if paramter.name == "voice":
                voice = paramter.default if paramter.name not in kwargs else kwargs[paramter.name]
            if paramter.name == "rate":
                rate = paramter.default if paramter.name not in kwargs else kwargs[paramter.name]
            if paramter.name == "volume":
                volume = paramter.default if paramter.name not in kwargs else kwargs[paramter.name]
            if paramter.name == "pitch":
                pitch = paramter.default if paramter.name not in kwargs else kwargs[paramter.name]
        if not voice:
            raise KeyError("LitAPI tts voice is required")
        logger.debug(f"[TTS] Engine input[{voice}]: {input.data}")
        rate = "+" + str(rate) + "%" if rate >= 0 else "" + str(rate) + "%"
        volume = "+" + str(volume) + "%" if volume >= 0 else "" + str(volume) + "%"
        pitch = "+" + str(pitch) + "Hz" if pitch >= 0 else "" + str(pitch) + "HZ"
        communicate = edge_tts.Communicate(
            text=input.data, 
            voice=voice,
            rate=rate,
            volume=volume,
            pitch=pitch
        )
        data = b''
        async for message in communicate.stream():
            if message["type"] == "audio":
                data += message["data"]
        # mp3 -> wav
        # data = mp3ToWav(data)
        message = AudioMessage(
            data=base64.b64encode(data).decode('utf-8'),
            sampleRate=16000,
            sampleWidth=2,
        )
        return message