# -*- coding: utf-8 -*-
'''
@File    :   configtest.py
@Author  :   一力辉 
'''

import os, sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from httpx import AsyncClient, ASGITransport
import pytest, pytest_asyncio
from digitalHuman.server import app


ROOT_PATH = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEST_PATH = os.path.join(ROOT_PATH, "test")
TEST_SRC_PATH = os.path.join(TEST_PATH, "src")
TEST_SRC_AUDIO_PATH = os.path.join(TEST_SRC_PATH, "audio")

# 初始化enginePool
from digitalHuman.engine import EnginePool
from digitalHuman.utils import config
enginePool = EnginePool()
enginePool.setup(config.SERVER.ENGINES)

# 初始化agentPool
from digitalHuman.agent import AgentPool
agentPool = AgentPool()
agentPool.setup(config.SERVER.AGENTS)

@pytest.fixture
def version() -> str:
    return "v0"

@pytest.fixture
def wavAudioZh() -> str:
    return os.path.join(TEST_SRC_AUDIO_PATH, "zh.wav")

# pytest使用同一个事件循环
# https://pytest-asyncio.readthedocs.io/en/latest/how-to-guides/run_session_tests_in_same_loop.html#
def pytest_collection_modifyitems(items):
    pytest_asyncio_tests = (item for item in items if pytest_asyncio.is_async_test(item))
    session_scope_marker = pytest.mark.asyncio(scope="session")
    for async_test in pytest_asyncio_tests:
        async_test.add_marker(session_scope_marker, append=False)

@pytest_asyncio.fixture()
def client() -> AsyncClient:
    client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
    return client