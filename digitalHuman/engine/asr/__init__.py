# -*- coding: utf-8 -*-
'''
@File    :   __init__.py
@Author  :   一力辉 
'''

from .tencentASR import TencentApiAsr
from .difyASR import DifyApiAsr
from .cozeASR import CozeApiAsr
from .funasrStreamingASR import FunasrStreamingAsr
from .asrFactory import ASRFactory

__all__ = ['ASRFactory']