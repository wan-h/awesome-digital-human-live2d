# AWESOME-DIGITAL-HUMAN
**打造一个有温度的数字人**  
**给数字人注入灵魂**  
---  
###### *业余时间发电，你的star是我最大的动力，感谢！*
---  

## 演示
https://github.com/user-attachments/assets/0650c443-d19b-4d5e-a409-5eed9a9ea9f7

## 主要特性
* 支持 Docker 快速部署
* 超轻量级，配置要求低于2核2G
* 支持 Dify/FastGPT 等编排框架服务接入
* 支持 ASR、LLM、TTS、Agent 模块化扩展
* 支持 Live2d 人物模型扩展和控制方式
* 支持PC端和移动端web访问  
PC端页面预览：  
![](./assets/pc_web.png)  
移动端页面预览：  
![](./assets/phone_web.jpg)

## 设计架构
大模型的厂商众多、各种工具繁多、要打造自己的数字人需要一定的代码能力和时间投入。
基于Dify等框架健全的应用模版和编排框架，让一切变得更加简单。  
![](./assets/arch.png)

## 版本记录
> ### v1.0.0
**界面简约，注重模块扩展性**
* [v1.0.0 - 2024-06-25](https://github.com/wan-h/awesome-digital-human-live2d/tree/v1.0.0)
  * 前端架构：react + antd
  * 后端架构：fastapi
  * ASR已接入：bauduAPI、googleAPI
  * LLM已接入：bauduAPI、openaiAPI
  * TTS已接入：bauduAPI、edgeAPI
  * Agent支持：repeater(复读机)、dialogue(对话)
  * 人物类型支持：女友（1）、心理师（1）、素人（11）
> ### v2.0.0
**拥抱Dify生态，打造自己的数字人灵魂（已测试最新dify版本：0.7.1）**
* [v2.0.0 - 2024-08-08](https://github.com/wan-h/awesome-digital-human-live2d/tree/main)
  * 前端页面全面升级：nextjs + nextui + tailwind
  * 前端页面兼容移动端访问
  * 前端支持三种交互模式：聊天模式、数字人模式、沉浸模式
  * 前端支持人物模型和背景切换以及个人定制扩展
  * Agent支持：difyAgent（ASR、TTS均可接入Dify）

## 部署&开发
[部署说明](./docs/deploy_instrction.md)  
[开发说明](./docs/developer_instrction.md)  
[常见问题](./docs/Q&A.md)  

[B站视频教程-部署](https://www.bilibili.com/video/BV1szePeaEak/)  

## Thanks
[Dify](https://github.com/langgenius/dify)  
[Live2D](https://github.com/Live2D)  
源码中涉及到的所有库作者

## Love & Share
**知乎板块**  
[数字人-定义数字世界中的你](https://zhuanlan.zhihu.com/p/676746017)  
[RAG架构浅析](https://zhuanlan.zhihu.com/p/703262854)  
[dify源码解析-RAG](https://zhuanlan.zhihu.com/p/704341817)  
[RAG-索引之PDF文档解析](https://zhuanlan.zhihu.com/p/707271297)  
[Dify打造专属数字人灵魂](https://zhuanlan.zhihu.com/p/714961925)
  
**微信公众号板块**  
[数字人-定义数字世界中的你](https://mp.weixin.qq.com/s/SQvFysHO8daN0HMA0AaJZw)  
[RAG架构浅析](https://mp.weixin.qq.com/s/4iWrJonD8_kjxw4ILibzSw)  
[dify源码解析-RAG](https://mp.weixin.qq.com/s/muCTFTWLY8j5UtxwCaW93A)  
[RAG-索引之PDF文档解析](https://mp.weixin.qq.com/s/innbTL6aeOsl9vyJSN6yBw)  
[Dify打造专属数字人灵魂](https://mp.weixin.qq.com/s/3B4YgYjDY42DNTgE76XOtw)

**产研板块**  
[数字人调研问卷](https://ec5cjmeodk.feishu.cn/share/base/dashboard/shrcnu1DNMUCTU18f5tF2q9qoQh)（感谢 [@plumixius](https://github.com/plumixius) 同学）


## 兴趣小组 
**扫码加群**  
![](assets/wechat.png)