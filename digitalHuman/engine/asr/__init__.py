# -*- coding: utf-8 -*-
'''
@File    :   __init__.py
@Author  :   一力辉 
'''

from .baiduASR import BaiduAPI
from .googleASR import GoogleAPI
from .asrFactory import ASRFactory

__all__ = ['ASRFactory']