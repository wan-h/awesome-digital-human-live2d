# -*- coding: utf-8 -*-
'''
@File    :   main.py
@Author  :   一力辉 
'''

from digitalHuman.utils import logger, config
from digitalHuman.bin import runServer

def showEnv():
    logger.info(f"[System] Welcome to Awesome digitalHuman System")
    logger.info(f"[System] Runing config:\n{config}")


if __name__ == '__main__':
    showEnv()
    runServer()
