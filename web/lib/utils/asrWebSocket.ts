/**
 * ASR WebSocket 流式识别客户端
 * 基于测试文件 test_asr_websocket_client.py 的协议实现
 */

// 协议常量定义（与服务端保持一致）
const ACTION_HEADER_SIZE = 18;
const DEFAULT_AUDIO_CHUNK_SIZE = 15360;
const MAX_PAYLOAD_SIZE = DEFAULT_AUDIO_CHUNK_SIZE * 2;
const PROTOCOL_HEADER_FORMAT = ">18sI"; // 大端序: 18字节action + 4字节无符号整数payload_size
const PROTOCOL_HEADER_SIZE = 22; // 18 + 4

/**
 * 格式化action名称为18字节，右侧用空格填充
 */
function formatAction(actionName: string): Uint8Array {
    if (actionName.length > ACTION_HEADER_SIZE) {
        throw new Error(`Action name '${actionName}' exceeds ${ACTION_HEADER_SIZE} bytes`);
    }
    const padded = actionName.padEnd(ACTION_HEADER_SIZE, ' ');
    return new TextEncoder().encode(padded);
}

// 动作类型定义
export const ActionType = {
    // 客户端请求类型
    START_STREAM: formatAction("START_STREAM"),
    AUDIO_CHUNK: formatAction("AUDIO_CHUNK"),
    FINAL_CHUNK: formatAction("FINAL_CHUNK"),
    END_STREAM: formatAction("END_STREAM"),
    PING: formatAction("PING"),

    // 服务端响应类型
    CONNECTION_ACK: formatAction("CONNECTION_ACK"),
    ENGINE_READY: formatAction("ENGINE_READY"),
    STREAM_STARTED: formatAction("STREAM_STARTED"),
    PARTIAL_TRANSCRIPT: formatAction("PARTIAL_TRANSCRIPT"),
    FINAL_TRANSCRIPT: formatAction("FINAL_TRANSCRIPT"),
    STREAM_ENDED: formatAction("STREAM_ENDED"),
    ERROR: formatAction("ERROR"),
    PONG: formatAction("PONG"),
};

/**
 * 解析二进制消息，返回{action, payload}
 */
function parseBinaryMessage(data: ArrayBuffer): { action: Uint8Array; payload: Uint8Array } {
    if (data.byteLength < PROTOCOL_HEADER_SIZE) {
        throw new Error(
            `Message too short: ${data.byteLength} bytes, expected at least ${PROTOCOL_HEADER_SIZE}`
        );
    }

    const view = new DataView(data);
    const action = new Uint8Array(data, 0, ACTION_HEADER_SIZE);
    const payloadSize = view.getUint32(ACTION_HEADER_SIZE, false); // 大端序
    
    const expectedTotalSize = PROTOCOL_HEADER_SIZE + payloadSize;
    if (data.byteLength !== expectedTotalSize) {
        throw new Error(
            `Message size mismatch: got ${data.byteLength} bytes, expected ${expectedTotalSize}`
        );
    }

    const payload = payloadSize > 0 
        ? new Uint8Array(data, PROTOCOL_HEADER_SIZE, payloadSize)
        : new Uint8Array(0);
    
    return { action, payload };
}

/**
 * 创建二进制消息
 */
function createBinaryMessage(action: Uint8Array, payload: Uint8Array = new Uint8Array(0)): ArrayBuffer {
    if (action.length !== ACTION_HEADER_SIZE) {
        throw new Error(
            `Action must be exactly ${ACTION_HEADER_SIZE} bytes, got ${action.length}`
        );
    }

    const payloadSize = payload.length;
    const totalSize = PROTOCOL_HEADER_SIZE + payloadSize;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    
    // 写入action (18字节)
    new Uint8Array(buffer, 0, ACTION_HEADER_SIZE).set(action);
    
    // 写入payload大小 (4字节，大端序)
    view.setUint32(ACTION_HEADER_SIZE, payloadSize, false);
    
    // 写入payload
    if (payloadSize > 0) {
        new Uint8Array(buffer, PROTOCOL_HEADER_SIZE, payloadSize).set(payload);
    }
    
    return buffer;
}

/**
 * 将文本编码为UTF-8字节
 */
function encodeTextPayload(text: string): Uint8Array {
    return new TextEncoder().encode(text);
}

/**
 * 将字节解码为UTF-8文本
 */
function decodeTextPayload(payload: Uint8Array): string {
    return payload.length > 0 ? new TextDecoder().decode(payload) : "";
}

/**
 * 比较两个Uint8Array是否相等
 */
function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

/**
 * 音频录制器
 */
export class AudioRecorder {
    private sampleRate: number;
    private channels: number;
    private chunkSize: number;
    private audioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private audioWorkletNode: AudioWorkletNode | null = null;
    private isRecording = false;
    private targetChunkSize: number; // 服务器要求的音频块大小：240ms * 16000Hz * 2字节 = 15360字节
    private audioBuffer: number[] = [];
    private onAudioChunk?: (chunk: Uint8Array) => void;

    constructor(
        sampleRate = 16000,
        channels = 1,
        chunkSize = 1024,
        onAudioChunk?: (chunk: Uint8Array) => void
    ) {
        this.sampleRate = sampleRate;
        this.channels = channels;
        this.chunkSize = chunkSize;
        this.targetChunkSize = 7680 * 2; // 15360字节
        this.onAudioChunk = onAudioChunk;
    }

    async startRecording(): Promise<void> {
        try {
            // 获取麦克风权限
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: this.sampleRate,
                    channelCount: this.channels,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });

            // 创建AudioContext
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: this.sampleRate
            });

            // 创建音频处理节点
            await this.audioContext.audioWorklet.addModule(
                URL.createObjectURL(new Blob([
                    `
                    class AudioProcessor extends AudioWorkletProcessor {
                        process(inputs, outputs, parameters) {
                            const input = inputs[0];
                            if (input && input[0]) {
                                // 将Float32Array转换为Int16Array
                                const float32Data = input[0];
                                const int16Data = new Int16Array(float32Data.length);
                                for (let i = 0; i < float32Data.length; i++) {
                                    const sample = Math.max(-1, Math.min(1, float32Data[i]));
                                    int16Data[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                                }
                                this.port.postMessage(int16Data);
                            }
                            return true;
                        }
                    }
                    registerProcessor('audio-processor', AudioProcessor);
                    `
                ], { type: 'application/javascript' }))
            );

            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');
            
            this.audioWorkletNode.port.onmessage = (event) => {
                if (this.isRecording) {
                    this.processAudioData(event.data);
                }
            };

            source.connect(this.audioWorkletNode);
            this.isRecording = true;
            
            console.log(`开始录音: ${this.sampleRate}Hz, ${this.channels}通道`);
        } catch (error) {
            console.error('启动录音失败:', error);
            throw error;
        }
    }

    private processAudioData(int16Data: Int16Array): void {
        // 将Int16Array转换为字节数组
        const bytes = new Uint8Array(int16Data.length * 2);
        for (let i = 0; i < int16Data.length; i++) {
            const sample = int16Data[i];
            bytes[i * 2] = sample & 0xFF;         // 低字节
            bytes[i * 2 + 1] = (sample >> 8) & 0xFF; // 高字节
        }
        
        // 添加到缓冲区
        for (let i = 0; i < bytes.length; i++) {
            this.audioBuffer.push(bytes[i]);
        }
        
        // 如果缓冲区达到目标大小，发送音频块
        while (this.audioBuffer.length >= this.targetChunkSize) {
            const chunk = new Uint8Array(this.audioBuffer.splice(0, this.targetChunkSize));
            if (this.onAudioChunk) {
                this.onAudioChunk(chunk);
            }
        }
    }

    getRemainingAudio(): Uint8Array | null {
        if (this.audioBuffer.length > 0) {
            const remainingData = new Uint8Array(this.audioBuffer);
            this.audioBuffer = [];
            
            // 如果剩余数据不足目标大小，用静音补足
            if (remainingData.length < this.targetChunkSize) {
                const silenceNeeded = this.targetChunkSize - remainingData.length;
                const paddedData = new Uint8Array(this.targetChunkSize);
                paddedData.set(remainingData);
                // 剩余部分已经是0（静音）
                console.log(`音频数据不足，补足静音: ${silenceNeeded} 字节`);
                return paddedData;
            }
            
            return remainingData;
        }
        return null;
    }

    stopRecording(): void {
        this.isRecording = false;
        
        if (this.audioWorkletNode) {
            this.audioWorkletNode.disconnect();
            this.audioWorkletNode = null;
        }
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        console.log('录音已停止');
    }

    cleanup(): void {
        this.stopRecording();
    }
}

/**
 * ASR WebSocket客户端事件接口
 */
export interface ASRWebSocketEvents {
    onConnectionAck?: (message: string) => void;
    onEngineReady?: (message: string) => void;
    onStreamStarted?: (message: string) => void;
    onPartialTranscript?: (text: string) => void;
    onFinalTranscript?: (text: string) => void;
    onStreamEnded?: (message: string) => void;
    onError?: (error: string) => void;
    onPong?: () => void;
}

/**
 * ASR WebSocket客户端
 */
export class ASRWebSocketClient {
    private serverUrl: string;
    private websocket: WebSocket | null = null;
    private audioRecorder: AudioRecorder | null = null;
    private isStreaming = false;
    private events: ASRWebSocketEvents;
    private finalTranscript = "";

    constructor(serverUrl = "ws://localhost:8880/adh/stream_asr/v0/engine", events: ASRWebSocketEvents = {}) {
        this.serverUrl = serverUrl;
        this.events = events;
    }

    async connect(): Promise<boolean> {
        try {
            console.log(`正在连接到服务器: ${this.serverUrl}`);
            this.websocket = new WebSocket(this.serverUrl);
            this.websocket.binaryType = 'arraybuffer';
            
            return new Promise((resolve, reject) => {
                if (!this.websocket) {
                    reject(new Error('WebSocket创建失败'));
                    return;
                }
                
                this.websocket.onopen = () => {
                    console.log('WebSocket连接成功');
                    this.setupMessageHandler();
                    resolve(true);
                };
                
                this.websocket.onerror = (error) => {
                    console.error('WebSocket连接失败:', error);
                    reject(error);
                };
                
                this.websocket.onclose = () => {
                    console.log('WebSocket连接已关闭');
                };
            });
        } catch (error) {
            console.error('连接失败:', error);
            return false;
        }
    }

    private setupMessageHandler(): void {
        if (!this.websocket) return;
        
        this.websocket.onmessage = (event) => {
            try {
                if (event.data instanceof ArrayBuffer) {
                    const { action, payload } = parseBinaryMessage(event.data);
                    this.handleServerMessage(action, payload);
                } else {
                    console.error('收到非二进制消息:', event.data);
                }
            } catch (error) {
                console.error('解析消息失败:', error);
            }
        };
    }

    private handleServerMessage(action: Uint8Array, payload: Uint8Array): void {
        const messageText = decodeTextPayload(payload);
        
        if (arraysEqual(action, ActionType.CONNECTION_ACK)) {
            console.log(`服务器确认连接: ${messageText}`);
            this.events.onConnectionAck?.(messageText);
        } else if (arraysEqual(action, ActionType.ENGINE_READY)) {
            console.log(`ASR引擎就绪: ${messageText}`);
            this.events.onEngineReady?.(messageText);
        } else if (arraysEqual(action, ActionType.STREAM_STARTED)) {
            console.log(`音频流已开始: ${messageText}`);
            this.events.onStreamStarted?.(messageText);
        } else if (arraysEqual(action, ActionType.PARTIAL_TRANSCRIPT)) {
            console.log(`部分识别结果: ${messageText}`);
            this.events.onPartialTranscript?.(messageText);
        } else if (arraysEqual(action, ActionType.FINAL_TRANSCRIPT)) {
            console.log(`最终识别结果: ${messageText}`);
            this.finalTranscript = messageText;
            this.events.onFinalTranscript?.(messageText);
        } else if (arraysEqual(action, ActionType.STREAM_ENDED)) {
            console.log(`音频流已结束: ${messageText}`);
            this.events.onStreamEnded?.(messageText);
        } else if (arraysEqual(action, ActionType.PONG)) {
            console.log('收到PONG响应');
            this.events.onPong?.();
        } else if (arraysEqual(action, ActionType.ERROR)) {
            console.error(`服务器错误: ${messageText}`);
            this.events.onError?.(messageText);
        } else {
            const actionName = new TextDecoder().decode(action).trim();
            console.warn(`未知消息类型: ${actionName}`);
        }
    }

    isConnected(): boolean {
        return this.websocket !== null && this.websocket.readyState === WebSocket.OPEN;
    }

    async disconnect(): Promise<void> {
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
            console.log('WebSocket连接已断开');
        }
    }

    private async sendMessage(action: Uint8Array, payload: Uint8Array = new Uint8Array(0)): Promise<boolean> {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            console.error('WebSocket未连接');
            return false;
        }
        
        try {
            const message = createBinaryMessage(action, payload);
            this.websocket.send(message);
            console.log(`发送消息: ${new TextDecoder().decode(action).trim()}`);
            return true;
        } catch (error) {
            console.error('发送消息失败:', error);
            return false;
        }
    }

    private async sendAudioChunk(audioData: Uint8Array, isFinal = false): Promise<boolean> {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            console.error('WebSocket未连接');
            return false;
        }
        
        try {
            const action = isFinal ? ActionType.FINAL_CHUNK : ActionType.AUDIO_CHUNK;
            const message = createBinaryMessage(action, audioData);
            this.websocket.send(message);
            console.log(`发送音频块: ${audioData.length} 字节 ${isFinal ? '(最终块)' : '(普通块)'}`);
            return true;
        } catch (error) {
            console.error('发送音频数据失败:', error);
            return false;
        }
    }

    async startAudioStream(): Promise<boolean> {
        // 发送开始流消息
        if (!await this.sendMessage(ActionType.START_STREAM)) {
            return false;
        }
        
        // 等待一下确保服务器准备好
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 创建音频录制器
        this.audioRecorder = new AudioRecorder(
            16000, // 采样率
            1,     // 单声道
            1024,  // 块大小
            (chunk) => {
                if (this.isStreaming) {
                    this.sendAudioChunk(chunk);
                }
            }
        );
        
        // 启动录音
        await this.audioRecorder.startRecording();
        this.isStreaming = true;
        
        console.log('音频流已启动');
        return true;
    }

    async stopAudioStream(): Promise<void> {
        this.isStreaming = false;
        
        // 发送剩余的音频数据作为最终块
        if (this.audioRecorder) {
            const remainingAudio = this.audioRecorder.getRemainingAudio();
            if (remainingAudio && remainingAudio.length > 0) {
                console.log(`发送剩余音频数据: ${remainingAudio.length} 字节`);
                await this.sendAudioChunk(remainingAudio, true);
            }
            
            // 停止录音
            this.audioRecorder.stopRecording();
            this.audioRecorder = null;
        }
        
        // 发送结束流消息
        await this.sendMessage(ActionType.END_STREAM);
        
        console.log('音频流已停止');
    }

    async ping(payload = "test_ping"): Promise<boolean> {
        return await this.sendMessage(ActionType.PING, encodeTextPayload(payload));
    }

    getFinalTranscript(): string {
        return this.finalTranscript;
    }

    clearFinalTranscript(): void {
        this.finalTranscript = "";
    }
}