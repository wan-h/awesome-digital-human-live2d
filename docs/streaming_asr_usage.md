# 流式ASR使用指南

## 概述

流式ASR (Automatic Speech Recognition) 功能为数字人项目提供了实时语音识别能力。用户可以通过麦克风实时输入语音，系统会即时返回识别结果，大大提升了交互体验。

## 功能特点

- **实时识别**: 支持音频流的实时处理和识别
- **部分结果**: 在识别过程中返回部分识别结果
- **最终结果**: 音频结束后返回完整的识别结果
- **高效传输**: 使用自定义二进制协议，优化网络传输
- **稳定连接**: 完善的连接状态管理和错误处理

## 系统要求

### 服务端要求

- Python 3.11+
- 内存: 建议4GB以上
- 网络: 稳定的网络连接
- 依赖包: funasr-onnx, modelscope等

### 客户端要求

- 支持WebSocket的浏览器或应用
- 麦克风设备
- 音频格式: 16kHz, 16bit, 单声道PCM

## 快速开始

### 1. 服务端配置

#### 安装依赖

```bash
# 安装FunASR相关依赖
pip install funasr-onnx
pip install modelscope
```

#### 配置ASR引擎

编辑配置文件 `configs/engines/asr/funasrStreamingAPI.yaml`:

```yaml
# FunASR流式ASR引擎配置
NAME: funasr_streaming_engine

# 模型配置
MODEL_NAME: "iic/speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8404-online-onnx"
```

#### 启动服务

```bash
# 启动数字人服务
python main.py
```

服务启动后，流式ASR WebSocket端点将在以下地址可用:
```
ws://localhost:8000/adh/streaming_asr/ws/asr/v0/stream
```

## 集成到Web应用

### JavaScript WebSocket客户端示例

```javascript
class StreamingASRClient {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.websocket = null;
        this.isRecording = false;
    }

    // 连接到服务器
    async connect() {
        this.websocket = new WebSocket(this.serverUrl);
        
        this.websocket.onopen = () => {
            console.log('WebSocket连接已建立');
        };
        
        this.websocket.onmessage = (event) => {
            this.handleMessage(event.data);
        };
        
        this.websocket.onerror = (error) => {
            console.error('WebSocket错误:', error);
        };
    }

    // 处理服务器消息
    handleMessage(data) {
        // 解析二进制协议消息
        const action = this.parseAction(data);
        const payload = this.parsePayload(data);
        
        switch(action) {
            case 'PARTIAL_TRANSCRIPT':
                this.onPartialResult(payload);
                break;
            case 'FINAL_TRANSCRIPT':
                this.onFinalResult(payload);
                break;
            case 'ERROR':
                this.onError(payload);
                break;
        }
    }

    // 开始录音
    async startRecording() {
        // 发送START_STREAM消息
        this.sendMessage('START_STREAM');
        
        // 获取麦克风权限并开始录音
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                sampleRate: 16000,
                channelCount: 1,
                sampleSize: 16
            }
        });
        
        this.processAudioStream(stream);
    }

    // 处理音频流
    processAudioStream(stream) {
        const audioContext = new AudioContext({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        
        processor.onaudioprocess = (event) => {
            const audioData = event.inputBuffer.getChannelData(0);
            const int16Array = this.float32ToInt16(audioData);
            this.sendAudioChunk(int16Array);
        };
        
        source.connect(processor);
        processor.connect(audioContext.destination);
    }

    // 发送音频数据
    sendAudioChunk(audioData) {
        const message = this.createBinaryMessage('AUDIO_CHUNK', audioData);
        this.websocket.send(message);
    }

    // 停止录音
    stopRecording() {
        this.sendMessage('END_STREAM');
        this.isRecording = false;
    }

    // 创建二进制消息
    createBinaryMessage(action, payload = new Uint8Array()) {
        const actionBytes = new TextEncoder().encode(action.padEnd(18));
        const payloadSize = new Uint32Array([payload.length]);
        
        const message = new Uint8Array(22 + payload.length);
        message.set(actionBytes, 0);
        message.set(new Uint8Array(payloadSize.buffer), 18);
        message.set(payload, 22);
        
        return message;
    }

    // 音频格式转换
    float32ToInt16(float32Array) {
        const int16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            int16Array[i] = Math.max(-32768, Math.min(32767, float32Array[i] * 32768));
        }
        return int16Array;
    }

    // 回调函数
    onPartialResult(text) {
        console.log('部分识别结果:', text);
        // 更新UI显示部分结果
    }

    onFinalResult(text) {
        console.log('最终识别结果:', text);
        // 更新UI显示最终结果
    }

    onError(error) {
        console.error('识别错误:', error);
        // 处理错误
    }
}

// 使用示例
const client = new StreamingASRClient('ws://localhost:8000/adh/streaming_asr/ws/asr/v0/stream');
await client.connect();
await client.startRecording();
```

## 性能优化建议

### 音频处理优化

1. **合适的块大小**: 推荐使用15360字节(约480ms)的音频块
2. **缓冲管理**: 客户端应维护音频缓冲区，避免发送过小的数据块
3. **采样率匹配**: 确保音频采样率为16kHz，避免重采样开销

### 网络优化

1. **心跳机制**: 定期发送PING消息保持连接活跃
2. **重连策略**: 实现自动重连机制处理网络中断
3. **错误处理**: 完善的错误处理和状态恢复机制

### 服务端优化

1. **连接池管理**: 合理限制并发连接数
2. **资源监控**: 监控内存和CPU使用情况
3. **日志记录**: 详细的操作日志便于问题排查

## 故障排除

### 常见问题

#### 1. 连接失败

**问题**: WebSocket连接无法建立

**解决方案**:
- 检查服务器是否正常运行
- 确认端口8000是否开放
- 检查防火墙设置

#### 2. 音频格式错误

**问题**: 服务器返回音频格式错误

**解决方案**:
- 确保音频采样率为16kHz
- 检查音频是否为单声道
- 验证音频位深度为16bit

#### 3. 识别效果差

**问题**: 语音识别准确率低

**解决方案**:
- 检查麦克风质量和环境噪音
- 确保音频块大小合适
- 验证网络传输稳定性

#### 4. 内存占用过高

**问题**: 服务器内存使用过多

**解决方案**:
- 检查是否有内存泄漏
- 合理设置连接超时时间
- 监控并发连接数量

### 调试技巧

1. **启用详细日志**: 使用`--verbose`参数查看详细日志
2. **网络抓包**: 使用Wireshark等工具分析WebSocket通信
3. **性能监控**: 使用系统监控工具观察资源使用情况
4. **单元测试**: 运行项目提供的测试用例验证功能

## 扩展开发

### 自定义ASR引擎

如果需要集成其他ASR引擎，可以参考`FunasrStreamingASR`的实现:

```python
from digitalHuman.engine.engineBase import AsyncStreamEngine
from digitalHuman.engine.builder import ASREngines

@ASREngines.register("custom_streaming_asr")
class CustomStreamingASR(AsyncStreamEngine):
    def __init__(self, config):
        super().__init__(config)
        # 初始化自定义引擎
    
    def setup(self):
        # 引擎设置逻辑
        pass
    
    async def run_stream(self, audio_message, **kwargs):
        # 流式处理逻辑
        pass
```

### 协议扩展

可以在现有协议基础上添加新的消息类型:

```python
class ActionType:
    # 现有消息类型...
    
    # 新增消息类型
    CUSTOM_ACTION = _format_action("CUSTOM_ACTION")
```

## 参考资料

- [FunASR官方文档](https://github.com/alibaba-damo-academy/FunASR)
- [流式ASR协议文档](./streaming_asr_protocol.md)
- [项目开发说明](./developer_instrction.md)