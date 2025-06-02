# -*- coding: utf-8 -*-
'''
@File    :   tencentASR.py
@Author  :   一力辉
'''

# 参数配置参考: https://cloud.tencent.com/document/api/1093/35646

from ..builder import ASREngines
from ..engineBase import BaseASREngine
import hashlib
import hmac
import time
import json
import base64
from datetime import datetime, timezone
from typing import Tuple, Dict
from digitalHuman.protocol import *
from digitalHuman.utils import logger, httpxAsyncClient
from pydantic import BaseModel

__all__ = ["TencentApiAsr"]


def sign(key, msg: str):
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()

class TencentCloudApiKey(BaseModel):
    secret_id: str
    secret_key: str


@ASREngines.register("Tencent-API")
class TencentApiAsr(BaseASREngine): 
    def setup(self):
        self._url = "https://asr.tencentcloudapi.com"
    
    def _buildRequest(self, input: AudioMessage, tencentApiKey: TencentCloudApiKey) -> Tuple[Dict, str]:
        VoiceFormat = "mp3" if input.type == AUDIO_TYPE.MP3 else "wav"
        service = "asr"
        host = "asr.tencentcloudapi.com"
        version = "2019-06-14"
        action = "SentenceRecognition"
        algorithm = "TC3-HMAC-SHA256"
        timestamp = int(time.time())
        date = datetime.fromtimestamp(timestamp, timezone.utc).strftime("%Y-%m-%d")
        params = {
            "EngSerViceType": "16k_zh-PY",
            "SourceType": 1,
            "VoiceFormat": VoiceFormat,
            "Data": input.data,
            "DataLen": len(input.data)
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

    async def run(self, input: AudioMessage, **kwargs) -> TextMessage:
        if isinstance(input.data, bytes):
            input.data = base64.b64encode(input.data).decode("utf-8")

        # 参数校验
        paramters = self.checkParameter(**kwargs)
        SECRECT_ID = paramters["secret_id"]
        SECRECT_KEY = paramters["secret_key"]
        headers, payload = self._buildRequest(input, TencentCloudApiKey(secret_id=SECRECT_ID, secret_key=SECRECT_KEY))
        response = await httpxAsyncClient.post(self._url, headers=headers, data=payload)
        if response.status_code != 200:
            raise RuntimeError(f"Tencet asr api error: {response.status_code}")
        result = response.json()["Response"]["Result"]
        logger.debug(f"[ASR] Engine response: {result}")
        message = TextMessage(data=result)
        return message