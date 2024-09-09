# -*- coding: utf-8 -*-
'''
@File    :   test_common_api.py
@Author  :   一力辉 
'''
import pytest
from starlette.testclient import TestClient
from httpx import AsyncClient

from digitalHuman.server import app


class Test_COMMON_API():
    # @pytest.mark.asyncio(scope="session")
    # async def test_heartbeat(self, version: str, client: AsyncClient):
    #     url = f"/adh/common/{version}/heartbeat"
    #     resp = await client.get(url)
    #     assert resp.status_code == 200
    #     resp = resp.json()
    #     assert resp["code"] == 0
    #     assert resp["data"] == 1

    @pytest.mark.asyncio(scope="session")
    async def test_websocket_heartbeat(self, version: str, client: AsyncClient):
        client = TestClient(app)
        with client.websocket_connect(f"/adh/common/{version}/heartbeat") as ws:
            ws.send_text("ping")
            data = ws.receive_text()
            assert data == "pong"

