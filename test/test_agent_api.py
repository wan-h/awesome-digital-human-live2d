# -*- coding: utf-8 -*-
'''
@File    :   test_asr_api.py
@Author  :   一力辉 
'''

import pytest
from httpx import AsyncClient


class Test_AGENT_API():
    # ======================== list ==========================
    @pytest.mark.asyncio(scope="session")
    async def test_list(self, version: str, client: AsyncClient):
        url = f"/adh/agent/{version}/list"
        resp = await client.get(url)
        assert resp.status_code == 200
        resp = resp.json()
        assert resp["code"] == 0
        assert len(resp["data"]) >= 1
        assert 'RepeaterAgent' in resp["data"]

    # ====================== repeater ========================
    @pytest.mark.asyncio(scope="session")
    async def test_repeater_text_infer(self, version: str, client: AsyncClient):
        url = f"/adh/agent/{version}/infer"
        item = {
            "engine": "RepeaterAgent",
            "settings": {},
            "data": "你好",
        }
        resp = await client.post(url, json=item)
        assert resp.status_code == 200
        resp = resp.json()
        assert resp["code"] == 0
        assert resp["data"] == "你好"