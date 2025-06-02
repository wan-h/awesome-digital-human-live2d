# -*- coding: utf-8 -*-
'''
@File    :   registry.py
@Author  :   一力辉 
'''

__all__ = ['Registry']

def _register_generic(module_dict, module_name, module):
    assert module_name not in module_dict
    module_dict[module_name] = module

class Registry(dict):
    def __init__(self, *args, **kwargs):
        super(Registry, self).__init__(*args, **kwargs)

    def register(self, module_name=None, module=None):
        # used as function call
        if module is not None:
            name = module_name if module_name else module.__name__
            _register_generic(self, name, module)
            return

        # used as decorator
        def register_fn(fn):
            name = module_name if module_name else fn.__name__
            _register_generic(self, name, fn)
            return fn

        return register_fn

    def list(self):
        return list(self.keys())