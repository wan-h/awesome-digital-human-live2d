# -*- coding: utf-8 -*-
'''
@File    :   test_asr_api.py
@Author  :   一力辉 
'''

import pytest
from httpx import AsyncClient

class Test_LLM_API():
    # @pytest.mark.asyncio(scope="session")
    # async def test_baiduAPI_infer(self, version: str, client: AsyncClient):
    #     url = f"/adh/llm/{version}/infer"
    #     item = {
    #         "engine": "BaiduAPI",
    #         "data": "你好",
    #     }
    #     resp = await client.post(url, json=item)
    #     assert resp.status_code == 200
    #     resp = resp.json()
    #     print("=" * 100)
    #     print(resp)
    #     assert resp["code"] == 0
    #     assert len(resp["data"]) > 3
    pass