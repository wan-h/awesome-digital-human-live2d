# -*- coding: utf-8 -*-
'''
@File    :   test_asr_api.py
@Author  :   一力辉 
'''

import base64
import pytest
from httpx import AsyncClient

class Test_ASR_API():
    @pytest.mark.asyncio(scope="session")
    async def test_baiduAPI_infer(self, version: str, client: AsyncClient, wavAudioZh: str):
        url = f"/asr/{version}/infer"
        with open(wavAudioZh, "rb") as f:
            data = base64.b64encode(f.read()).decode('utf-8')
        item = {
            "engine": "BaiduAPI",
            "data": data,
            "format": "wav",
            "sampleRate": "16000",
            "sampleWidth": 2, 
        }
        resp = await client.post(url, json=item)
        assert resp.status_code == 200
        resp = resp.json()
        assert resp["code"] == 0
        assert resp["data"] == "我认为跑步最重要的就是给我带来了身体健康。"