## AWESOME-DIGITAL-HUMAN-开发指南

### 配置文件说明
由于扩展的多样性，通过一个全局的配置文件管理各个模块的子配置文件    
配置文件的目录结构如下:  
```bash
.
├── config.yaml                  # 全局配置文件
├── agents                       # agent 配置文件目录
└── engines                      # 引擎配置文件目录
    ├── asr                      # 语音识别引擎配置文件目录
    ├── llm                      # 大模型引擎配置文件目录
    └── tts                      # 文字转语音引擎配置目录
```
[全局配置](configs/config.yaml)文件中的内容如下:  
```yaml
COMMON:                                 # 通用配置项
  NAME: "Awesome-Digital-Human"         # 名字
  VERSION: "v3.0.0"                     # 版本
  LOG_LEVEL: "DEBUG"                    # 日志等级
SERVER:                                 # 服务配置项
  IP: "0.0.0.0"                         # 服务启动IP
  PORT: 8000                            # 服务启动端口
  ENGINES:                              # 引擎配置项
    ASR:                                # 语音识别配置项
      SUPPORT_LIST: [ "xxx.yaml" ]      # 支持的语音识别列表(这些配置文件应当在configs/engines/asr目录下)
      DEFAULT: "xxx.yaml"               # 默认使用的语音识别配置
    LLM:                                # 大模型配置项(不需要配置, 预留模块)
      SUPPORT_LIST: [ "" ]              # 支持的大模型列表(这些配置文件应当在configs/engines/llm目录下)
      DEFAULT: ""                       # 默认使用的大模型配置
    TTS:                                # 文字转语音配置项
      SUPPORT_LIST: [ "xxx.yaml" ]      # 支持的文字转语音列表(这些配置文件应当在configs/engines/tts目录下)
      DEFAULT: "xxx.yaml"               # 默认使用的文字转语音配置
  AGENTS:                               # Agent 配置项目
    SUPPORT_LIST: [ "xxx.yaml" ]        # 支持的Agent列表(这些配置文件应当在configs/agents目录下)
    DEFAULT: "xxx.yaml"                 # 默认使用的Agent配置
```

### 定制化开发
#### 人物模型
* 需要live2d支持的模型👉[社区设计师定制](https://light4ai.feishu.cn/share/base/form/shrcnb0d1Au4dvMaswHNGDbUNTR)  
* 人物模型控制使用 [live2d web SDK](https://www.live2d.com/en/sdk/about/)  
* 项目开源人物模型均来自 [live2d官方免费素材](https://www.live2d.com/zh-CHS/learn/sample/)   

添加人物模型到`awesome-digital-human-live2d/web/public/sentio/characters`目录下并在`awesome-digital-human-live2d/web/lib/constants.ts`中修改字段`SENTIO_CHARACTER_IP_MODELS`或`SENTIO_CHARACTER_FREE_MODELS`添加人物模型名称即可  
人物模型规则参考[操作指南](https://light4ai.feishu.cn/docx/XmGFd5QJwoBdDox8M7zcAcRJnje)中的画廊自定义人物部分
#### 背景图片
添加图片到`awesome-digital-human-live2d/web/public/sentio/backgrounds`目录下并在`awesome-digital-human-live2d/web/lib/constants.ts`中修改字段`SENTIO_BACKGROUND_STATIC_IMAGES`或`SENTIO_BACKGROUND_DYNAMIC_IMAGES`添加图片名称即可
#### 后端模块扩展
（后端引擎均通过注册的方式，asr、llm、tts、agent方式相同）
##### 常规引擎  
对于asr、llm、tts的扩展实现在`digitalHuman/engine`目录下，也可以依葫芦画瓢扩展更多的引擎，以扩展openai大模型为例（这里只是作为一个示例，使用difyAgent后并不会再使用llm engine）:  
* 新增llm配置文件  
![](../assets/llm-extend-1.png)
* 全局配置文件支持新增的llm  
![](../assets/llm-extend-2.png)
* llm推理实现并注册  
![](../assets/llm-extend-3.png)
* 模块入口函数引用(动态注册的方式，需要被import一下)  
![](../assets/llm-extend-4.png)
##### agent
对于agent的扩展实现在`digitalHuman/agent/core`目录下，扩展方式和常规引擎相同，这里的agent可以使用上面的常规引擎自己构建，也可以接入像dify这样的编排框架平台  
唯一不同点在于agent需要向前端暴露参数，可以通过在配置文件中暴露参数，前端根据暴露的参数渲染，同时会使用这设置的默认值  
![](../assets/agent-extend-1.png)