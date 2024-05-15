# -*- coding: utf-8 -*-
'''
@File    :   path.py
@Author  :   一力辉 
'''

import os
import warnings

ROOT_PATH = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONFIG_ROOT_PATH = os.path.join(ROOT_PATH, "configs")
CONFIG_FILE = os.path.join(CONFIG_ROOT_PATH, "config.yaml")
LOG_PATH = os.path.join(ROOT_PATH, "logs")
OUTPUT_PATH = os.path.join(ROOT_PATH, "outputs")
WEB_PATH = os.path.join(ROOT_PATH, "web")

# Create tmp folder
if not os.path.exists(OUTPUT_PATH):
    os.makedirs(OUTPUT_PATH)
    warnings.warn(f"Create output path: {OUTPUT_PATH}")