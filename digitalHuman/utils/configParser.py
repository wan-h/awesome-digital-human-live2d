# -*- coding: utf-8 -*-
'''
@File    :   configParser.py
@Author  :   一力辉 
'''

import os
from digitalHuman.utils.env import CONFIG_ROOT_PATH, CONFIG_FILE
from yacs.config import CfgNode as CN

def parseConfig(configFile: str) -> CN:
    with open(configFile, 'r') as f:
        config = CN.load_cfg(f)
        return config
    
def parseServerConfig(config: CN) -> None:
    # 加载engines配置文件
    config.ENGINES.ASR.SUPPORT_LIST = [parseConfig(os.path.join(CONFIG_ROOT_PATH, "engines", "asr", configFile)) for configFile in config.ENGINES.ASR.SUPPORT_LIST]
    config.ENGINES.LLM.SUPPORT_LIST = [parseConfig(os.path.join(CONFIG_ROOT_PATH, "engines", "llm", configFile)) for configFile in config.ENGINES.LLM.SUPPORT_LIST]
    config.ENGINES.TTS.SUPPORT_LIST = [parseConfig(os.path.join(CONFIG_ROOT_PATH, "engines", "tts", configFile)) for configFile in config.ENGINES.TTS.SUPPORT_LIST]
    config.ENGINES.ASR.DEFAULT = parseConfig(os.path.join(CONFIG_ROOT_PATH, "engines", "asr", config.ENGINES.ASR.DEFAULT)).NAME
    config.ENGINES.LLM.DEFAULT = parseConfig(os.path.join(CONFIG_ROOT_PATH, "engines", "llm", config.ENGINES.LLM.DEFAULT)).NAME
    config.ENGINES.TTS.DEFAULT = parseConfig(os.path.join(CONFIG_ROOT_PATH, "engines", "tts", config.ENGINES.TTS.DEFAULT)).NAME
    
    # 加载agents配置文件
    config.AGENTS.SUPPORT_LIST = [parseConfig(os.path.join(CONFIG_ROOT_PATH, "agents", configFile)) for configFile in config.AGENTS.SUPPORT_LIST]
    config.AGENTS.DEFAULT = parseConfig(os.path.join(CONFIG_ROOT_PATH, "agents", config.AGENTS.DEFAULT)).NAME

def getConfig(configFile: str) -> CN:
    with open(configFile, 'r', encoding='utf-8') as f:
        config = CN.load_cfg(f)
        parseServerConfig(config.SERVER)
        config.freeze()
        return config

config = getConfig(CONFIG_FILE)