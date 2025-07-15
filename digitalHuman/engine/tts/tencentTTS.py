# -*- coding: utf-8 -*-
'''
@File    :   tencentTTS.py
@Author  :   一力辉
'''


from ..builder import TTSEngines
from ..engineBase import BaseTTSEngine
import hashlib
import hmac
import time
import json
from uuid import uuid4
from datetime import datetime, timezone
from typing import Tuple, Dict
from digitalHuman.protocol import *
from digitalHuman.utils import logger, httpxAsyncClient
from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal


__all__ = ["TencentApiTts"]


MAX_INPUT_LENGTH = 150

# neutral(中性)、sad(悲伤)、happy(高兴)、angry(生气)、fear(恐惧)、sajiao(撒娇)、amaze(震惊)、disgusted(厌恶)、peaceful(平静)
# 中性、悲伤、高兴、生气、恐惧、撒娇、震惊、厌恶、平静
class TencentVoiceEmotion(StrEnum):
    NEUTRAL = "neutral"
    SAD = "sad"
    HAPPY = "happy"
    ANGRY = "angry"
    FEAR = "fear"
    SAJIAO = "sajiao"
    AMAZE = "amaze"
    DISGUSTED = "disgusted"
    PEACEFUL = "peaceful"

class TencentVoiceDesc(BaseModel):
    id: int
    name: str
    gender: GENDER_TYPE
    language: str
    multi_emotional: bool

VOICE_LIST = [
    TencentVoiceDesc(id=501000, name="智斌", gender=GENDER_TYPE.MALE, language="中文", multi_emotional=False),
    TencentVoiceDesc(id=501001, name="智兰", gender=GENDER_TYPE.FEMALE, language="中文", multi_emotional=False),
    TencentVoiceDesc(id=501002, name="智菊", gender=GENDER_TYPE.FEMALE, language="中文", multi_emotional=False),
    TencentVoiceDesc(id=501003, name="智宇", gender=GENDER_TYPE.MALE, language="中文", multi_emotional=False),
    TencentVoiceDesc(id=501004, name="月华", gender=GENDER_TYPE.FEMALE, language="中文", multi_emotional=False),
    TencentVoiceDesc(id=501005, name="飞镜", gender=GENDER_TYPE.MALE, language="中文", multi_emotional=False),
    TencentVoiceDesc(id=501006, name="千嶂", gender=GENDER_TYPE.MALE, language="中文", multi_emotional=False),
    TencentVoiceDesc(id=501007, name="浅草", gender=GENDER_TYPE.MALE, language="中文", multi_emotional=False),
    TencentVoiceDesc(id=501008, name="WeJames", gender=GENDER_TYPE.MALE, language="英文", multi_emotional=False),
    TencentVoiceDesc(id=501009, name="WeWinny", gender=GENDER_TYPE.FEMALE, language="中文", multi_emotional=False),
    TencentVoiceDesc(id=601000, name="爱小溪", gender=GENDER_TYPE.FEMALE, language="中文", multi_emotional=True),
    TencentVoiceDesc(id=601001, name="爱小洛", gender=GENDER_TYPE.FEMALE, language="中文", multi_emotional=True),
    TencentVoiceDesc(id=601002, name="爱小辰", gender=GENDER_TYPE.MALE, language="中文", multi_emotional=True),
    TencentVoiceDesc(id=601003, name="爱小荷", gender=GENDER_TYPE.FEMALE, language="中文", multi_emotional=True),
    TencentVoiceDesc(id=601004, name="爱小树", gender=GENDER_TYPE.MALE, language="中文", multi_emotional=True),
    TencentVoiceDesc(id=601005, name="爱小静", gender=GENDER_TYPE.FEMALE, language="中文", multi_emotional=True),
    TencentVoiceDesc(id=601006, name="爱小耀", gender=GENDER_TYPE.MALE, language="中文", multi_emotional=True),
    TencentVoiceDesc(id=601007, name="爱小叶", gender=GENDER_TYPE.FEMALE, language="中文", multi_emotional=True),
    TencentVoiceDesc(id=601008, name="爱小豪", gender=GENDER_TYPE.MALE, language="中文", multi_emotional=True),
    TencentVoiceDesc(id=601009, name="爱小芊", gender=GENDER_TYPE.FEMALE, language="中文", multi_emotional=True),
    TencentVoiceDesc(id=601010, name="爱小娇", gender=GENDER_TYPE.FEMALE, language="中文", multi_emotional=True),
    TencentVoiceDesc(id=601011, name="爱小川", gender=GENDER_TYPE.MALE, language="中文", multi_emotional=True),
    TencentVoiceDesc(id=601012, name="爱小璟", gender=GENDER_TYPE.FEMALE, language="中文", multi_emotional=True),
    TencentVoiceDesc(id=601013, name="爱小伊", gender=GENDER_TYPE.FEMALE, language="中文", multi_emotional=True),
    TencentVoiceDesc(id=601014, name="爱小简", gender=GENDER_TYPE.MALE, language="中文", multi_emotional=True),
]

class TencentCloudApiKey(BaseModel):
    secret_id: str
    secret_key: str

def findVoice(name: str) -> Optional[TencentVoiceDesc]:
    for voice in VOICE_LIST:
        if voice.name == name:
            return voice
    return None

def sign(key, msg: str):
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()

@TTSEngines.register("Tencent-API")
class TencentApiTts(BaseTTSEngine): 
    def setup(self):
        self._url = "https://tts.tencentcloudapi.com"
    
    def _buildRequest(
        self, 
        input: TextMessage, 
        tencentApiKey: TencentCloudApiKey, 
        voice: str, 
        volume: float, 
        speed: float, 
        emotionCategory: str = TencentVoiceEmotion.NEUTRAL
    ) -> Tuple[Dict, str]:
        service = "tts"
        host = "tts.tencentcloudapi.com"
        version = "2019-08-23"
        action = "TextToVoice"
        algorithm = "TC3-HMAC-SHA256"
        timestamp = int(time.time())
        date = datetime.fromtimestamp(timestamp, timezone.utc).strftime("%Y-%m-%d")
        tencentVoice = findVoice(voice)
        if not tencentVoice:
            raise ValueError("voice not found")
        params = {
            "Text": input.data,
            "SessionId": str(uuid4()),
            "VoiceType": tencentVoice.id,
            # "Codec": "wav",
            "Codec": "mp3",
            "Volume": volume,
            "Speed": speed,
            "EmotionCategory": emotionCategory
        }
        payload = json.dumps(params)
        # ************* 步骤 1：拼接规范请求串 *************
        http_request_method = "POST"
        canonical_uri = "/"
        canonical_querystring = ""
        ct = "application/json; charset=utf-8"
        canonical_headers = "content-type:%s\nhost:%s\nx-tc-action:%s\n" % (ct, host, action.lower())
        signed_headers = "content-type;host;x-tc-action"
        hashed_request_payload = hashlib.sha256(payload.encode("utf-8")).hexdigest()
        canonical_request = (http_request_method + "\n" +
                            canonical_uri + "\n" +
                            canonical_querystring + "\n" +
                            canonical_headers + "\n" +
                            signed_headers + "\n" +
                            hashed_request_payload)

        # ************* 步骤 2：拼接待签名字符串 *************
        credential_scope = date + "/" + service + "/" + "tc3_request"
        hashed_canonical_request = hashlib.sha256(canonical_request.encode("utf-8")).hexdigest()
        string_to_sign = (algorithm + "\n" +
                        str(timestamp) + "\n" +
                        credential_scope + "\n" +
                        hashed_canonical_request)

        # ************* 步骤 3：计算签名 *************
        secret_date = sign(("TC3" + tencentApiKey.secret_key).encode("utf-8"), date)
        secret_service = sign(secret_date, service)
        secret_signing = sign(secret_service, "tc3_request")
        signature = hmac.new(secret_signing, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()

        # ************* 步骤 4：拼接 Authorization *************
        authorization = (algorithm + " " +
                        "Credential=" + tencentApiKey.secret_id + "/" + credential_scope + ", " +
                        "SignedHeaders=" + signed_headers + ", " +
                        "Signature=" + signature)

        # ************* 步骤 5：构造并发起请求 *************
        headers = {
            "Authorization": authorization,
            "Content-Type": "application/json; charset=utf-8",
            "Host": host,
            "X-TC-Action": action,
            "X-TC-Timestamp": str(timestamp),
            "X-TC-Version": version
        }

        return (headers, payload)

    async def voices(self, **kwargs) -> List[VoiceDesc]:
        return [VoiceDesc(name=v.name, gender=v.gender) for v in VOICE_LIST]
    
    async def run(self, input: TextMessage, **kwargs) -> AudioMessage:
        # 参数校验
        paramters = self.checkParameter(**kwargs)
        voice = paramters["voice"]
        speed = paramters["speed"]
        volume = paramters["volume"]
        SECRECT_ID = paramters["secret_id"]
        SECRECT_KEY = paramters["secret_key"]
        tencentCloudApiKey = TencentCloudApiKey(secret_id=SECRECT_ID, secret_key=SECRECT_KEY)
        headers, payload = self._buildRequest(input, tencentCloudApiKey, voice, volume, speed) 
        logger.debug(f"[TTS] Engine input: {input.data}")
        response = await httpxAsyncClient.post(self._url, headers=headers, data=payload)
        if response.status_code != 200:
            raise RuntimeError(f"Builtin tts api error: {response.status_code}")
        audio = response.json()["Response"]["Audio"]
        message = AudioMessage(
            data=audio,
            sampleRate=16000,
            sampleWidth=2,
        )
        return message
