# -*- coding: utf-8 -*-
'''
@File    :   runner.py
@Author  :   一力辉
'''

from typing import List, Dict
from yacs.config import CfgNode as CN
from abc import ABC, abstractmethod
from digitalHuman.protocol import BaseMessage, ParamDesc, EngineDesc, ENGINE_TYPE, INFER_TYPE

__all__ = ["BaseRunner"]

class BaseRunner(ABC):
    def __init__(self, config: CN, type: ENGINE_TYPE):
        self.cfg = config
        self._engineType = type
        self.setup()
    
    def __del__(self):
        self.release()
    
    @property
    def name(self) -> str:
        return self.cfg.NAME
    
    @property
    def type(self) -> ENGINE_TYPE:
        return self._engineType
    
    @property
    def inferType(self) -> INFER_TYPE:
        if "infer_type" not in self.meta(): return INFER_TYPE.NORMAL
        if self.meta()['infer_type'] == 'stream': 
            return INFER_TYPE.STREAM
        else:
            raise RuntimeError(f"Invalid infer type: {self.meta()['infer_type']}")
    
    def desc(self) -> EngineDesc:
        return EngineDesc(
            name=self.name,
            type=self.type,
            infer_type=self.inferType,
            desc=self.cfg.DESC if "DESC" in self.cfg else "",
            meta=self.meta()
        )
    
    def meta(self) -> Dict:
        if "META" not in self.cfg: return {}
        return self.cfg.META
    
    def custom(self) -> Dict:
        if "CUSTOM" not in self.cfg: return {}
        return self.cfg.CUSTOM

    def parameters(self) -> List[ParamDesc]:
        if "PARAMETERS" not in self.cfg: return []
        params = []
        for param in self.cfg.PARAMETERS:
            params.append(ParamDesc.model_validate(param))
        return params
    
    def checkParameter(self, **kwargs) -> Dict:
        paramters = {}
        for paramter in self.parameters():
            if paramter.name not in kwargs:
                if not paramter.required: 
                    paramters[paramter.name] = paramter.default
                    continue
                raise RuntimeError(f"Missing parameter: {paramter.name}")
            paramters[paramter.name] = kwargs[paramter.name]
        # 额外参数填充
        for k, v in kwargs.items():
            if k not in paramters:
                paramters[k] = v
        return paramters
    
    def setup(self):
        pass

    def release(self):
        pass

    @abstractmethod
    async def run(self, input: BaseMessage, **kwargs):
        raise NotImplementedError  