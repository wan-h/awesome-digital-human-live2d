# -*- coding: utf-8 -*-
'''
@File    :   strFilter.py
@Author  :   一力辉 
'''

import re
import emoji

def filterUnreadble(inputString):  
    # 过滤 # 号和 * 号  
    filteredString = inputString.replace('#', '').replace('*', '')
      
    # 过滤 Markdown 格式的图片  
    markdown_image_pattern = r'!\[.*?\]\((.*?)\)'  
    filteredString = re.sub(markdown_image_pattern, '', filteredString)  

    # 过滤表情符号  
    filteredString = ''.join(char for char in filteredString if not emoji.is_emoji(char))

    return filteredString  

if __name__ == "__main__":
    inputString = """
## Hello World
*I* love you! 😊🚀
![](test.jpg)
我爱你。
"""
    filteredString = filterUnreadble(inputString)
    print(filteredString)