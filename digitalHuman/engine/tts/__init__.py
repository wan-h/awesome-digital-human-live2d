# -*- coding: utf-8 -*-
'''
@File    :   __init__.py
@Author  :   一力辉 
'''

from .tencentTTS import *
from .edgeTTS import *
from .difyTTS import *
from .cozeTTS import *
from .ttsFactory import TTSFactory
# from .aliNLSTTS import AliNLSTTS

__all__ = ['TTSFactory']