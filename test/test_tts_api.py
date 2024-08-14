# -*- coding: utf-8 -*-
'''
@File    :   test_asr_api.py
@Author  :   一力辉 
'''

import os
import base64
import pytest
from httpx import AsyncClient
from digitalHuman.utils.env import  OUTPUT_PATH


class Test_TTS_API():
    # @pytest.mark.asyncio(scope="session")
    # async def test_baiduAPI_infer(self, version: str, client: AsyncClient):
    #     url = f"/adh/tts/{version}/infer"
    #     item = {
    #         "engine": "BaiduAPI",
    #         "data": "欢迎来到数字人系统",
    #     }
    #     resp = await client.post(url, json=item)
    #     assert resp.status_code == 200
    #     resp = resp.json()
    #     assert resp["code"] == 0
    #     assert resp["format"] == "wav"
    #     assert resp["sampleRate"] == 16000
    #     assert resp["sampleWidth"] == 2
    #     audio = base64.b64decode(resp["data"])
    #     assert len(audio) > 10
    #     with open(os.path.join(OUTPUT_PATH, "test_baiduAPI_infer." + resp["format"]), "wb") as f:
    #         f.write(audio)
    
    @pytest.mark.asyncio(scope="session")
    async def test_edgeAPI_infer(self, version, client):
        url = f"/adh/tts/{version}/infer"
        item = {
            "engine": "EdgeAPI",
            "data": "欢迎来到数字人系统",
        }
        resp = await client.post(url, json=item)
        assert resp.status_code == 200
        resp = resp.json()
        assert resp["code"] == 0
        assert resp["format"] == "wav"
        assert resp["sampleRate"] == 16000
        assert resp["sampleWidth"] == 2
        audio = base64.b64decode(resp["data"])
        assert len(audio) > 10
        with open(os.path.join(OUTPUT_PATH, "test_edgeAPI_infer." + resp["format"]), "wb") as f:
            f.write(audio)