# -*- coding: utf-8 -*-
'''
@File    :   __init__.py
@Author  :   一力辉 
'''

from .baiduTTS import BaiduAPI
from .edgeTTS import EdgeAPI
from .ttsFactory import TTSFactory

__all__ = ['TTSFactory']