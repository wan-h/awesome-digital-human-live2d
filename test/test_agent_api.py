# -*- coding: utf-8 -*-
'''
@File    :   test_asr_api.py
@Author  :   一力辉 
'''

import os
import pytest
import base64
from httpx import AsyncClient
from digitalHuman.utils.env import  OUTPUT_PATH
from digitalHuman.utils import AudioFormatType


class Test_AGENT_API():
    # ====================== repeater ========================
    @pytest.mark.asyncio(scope="session")
    async def test_repeater_wav_infer(self, version: str, client: AsyncClient, wavAudioZh: str):
        url = f"/agent/{version}/infer"
        with open(wavAudioZh, "rb") as f:
            data = base64.b64encode(f.read()).decode('utf-8')
        item = {
            "engine": "Repeater",
            "data": data,
            "format": "wav",
            "sampleRate": "16000",
            "sampleWidth": 2, 
        }
        resp = await client.post(url, json=item)
        assert resp.status_code == 200
        resp = resp.json()
        assert resp["code"] == 0
        assert resp["format"] in [format.value for format in AudioFormatType]
        assert resp["sampleRate"] == 16000
        assert resp["sampleWidth"] == 2
        audio = base64.b64decode(resp["data"])
        assert len(audio) > 10
        with open(os.path.join(OUTPUT_PATH, "test_repeater_wav_infer." + resp["format"]), "wb") as f:
            f.write(audio)
    
    @pytest.mark.asyncio(scope="session")
    async def test_repeater_text_infer(self, version: str, client: AsyncClient):
        url = f"/agent/{version}/infer"
        item = {
            "engine": "Repeater",
            "data": "欢迎来到数字人系统",
            "format": "text",
        }
        resp = await client.post(url, json=item)
        assert resp.status_code == 200
        resp = resp.json()
        assert resp["code"] == 0
        assert resp["format"] in [format.value for format in AudioFormatType]
        assert resp["sampleRate"] == 16000
        assert resp["sampleWidth"] == 2
        audio = base64.b64decode(resp["data"])
        assert len(audio) > 10
        with open(os.path.join(OUTPUT_PATH, "test_repeater_text_infer." + resp["format"]), "wb") as f:
            f.write(audio)
    
    # ====================== dialogue ========================
    @pytest.mark.asyncio(scope="session")
    async def test_dialogue_wav_infer(self, version: str, client: AsyncClient, wavAudioZh: str):
        url = f"/agent/{version}/infer"
        with open(wavAudioZh, "rb") as f:
            data = base64.b64encode(f.read()).decode('utf-8')
        item = {
            "engine": "Dialogue",
            "data": data,
            "format": "wav",
            "sampleRate": 16000,
            "sampleWidth": 2, 
        }
        resp = await client.post(url, json=item)
        assert resp.status_code == 200
        resp = resp.json()
        assert resp["code"] == 0
        assert resp["format"] in [format.value for format in AudioFormatType]
        assert resp["sampleRate"] == 16000
        assert resp["sampleWidth"] == 2
        audio = base64.b64decode(resp["data"])
        assert len(audio) > 10
        with open(os.path.join(OUTPUT_PATH, "test_dialogue_wav_infer." + resp["format"]), "wb") as f:
            f.write(audio)
    
    @pytest.mark.asyncio(scope="session")
    async def test_dialogue_text_infer(self, version: str, client: AsyncClient):
        url = f"/agent/{version}/infer"
        item = {
            "engine": "Dialogue",
            "data": "你好",
            "format": "text",
        }
        resp = await client.post(url, json=item)
        assert resp.status_code == 200
        resp = resp.json()
        assert resp["code"] == 0
        assert resp["format"] in [format.value for format in AudioFormatType]
        assert resp["sampleRate"] == 16000
        assert resp["sampleWidth"] == 2
        audio = base64.b64decode(resp["data"])
        assert len(audio) > 10
        with open(os.path.join(OUTPUT_PATH, "test_dialogue_text_infer." + resp["format"]), "wb") as f:
            f.write(audio)