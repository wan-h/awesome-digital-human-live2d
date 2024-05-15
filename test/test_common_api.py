# -*- coding: utf-8 -*-
'''
@File    :   test_common_api.py
@Author  :   一力辉 
'''

import pytest
from httpx import AsyncClient

class Test_COMMON_API():
    @pytest.mark.asyncio(scope="session")
    async def test_heartbeat(self, version: str, client: AsyncClient):
        url = f"/common/{version}/heartbeat"
        resp = await client.get(url)
        assert resp.status_code == 200
        resp = resp.json()
        assert resp["code"] == 0
        assert resp["data"] == 1