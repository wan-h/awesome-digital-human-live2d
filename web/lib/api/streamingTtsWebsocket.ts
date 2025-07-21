import { getWsUrl } from "./requests";

// 协议常量定义（与服务端保持一致）
const ACTION_HEADER_SIZE = 18;
const PAYLOAD_SIZE_BYTES = 4;
const PROTOCOL_HEADER_SIZE = ACTION_HEADER_SIZE + PAYLOAD_SIZE_BYTES; // 22字节

// TTS流式协议动作类型
export enum TTS_ACTION_TYPE {
    // 客户端请求
    START_STREAM = 'START_STREAM',
    TEXT_CHUNK = 'TEXT_CHUNK', 
    END_STREAM = 'END_STREAM',
    PING = 'PING',
    
    // 服务端响应
    CONNECTION_ACK = 'CONNECTION_ACK',
    ENGINE_READY = 'ENGINE_READY',
    STREAM_STARTED = 'STREAM_STARTED',
    AUDIO_CHUNK = 'AUDIO_CHUNK',
    TTS_COMPLETED = 'TTS_COMPLETED',
    STREAM_ENDED = 'STREAM_ENDED',
    ERROR = 'ERROR',
    PONG = 'PONG'
}

/**
 * 格式化action名称为18字节，右侧用空格填充
 */
function formatAction(action: string): string {
    return action.padEnd(ACTION_HEADER_SIZE, ' ').substring(0, ACTION_HEADER_SIZE);
}

/**
 * 创建二进制消息
 */
function createBinaryMessage(action: string, payload: Uint8Array = new Uint8Array(0)): Uint8Array {
    const actionBytes = new TextEncoder().encode(formatAction(action));
    const payloadSizeBytes = new ArrayBuffer(PAYLOAD_SIZE_BYTES);
    const payloadSizeView = new DataView(payloadSizeBytes);
    payloadSizeView.setUint32(0, payload.length, false); // 使用4字节无符号整数
    
    const message = new Uint8Array(actionBytes.length + payloadSizeBytes.byteLength + payload.length);
    message.set(actionBytes, 0);
    message.set(new Uint8Array(payloadSizeBytes), actionBytes.length);
    message.set(payload, actionBytes.length + payloadSizeBytes.byteLength);
    
    return message;
}

/**
 * 解析二进制消息
 */
function parseBinaryMessage(data: Uint8Array): { action: string; payload: Uint8Array } {
    if (data.length < PROTOCOL_HEADER_SIZE) {
        throw new Error(`Message too short: ${data.length} bytes, expected at least ${PROTOCOL_HEADER_SIZE}`);
    }
    
    const actionBytes = data.slice(0, ACTION_HEADER_SIZE);
    const payloadSizeBytes = data.slice(ACTION_HEADER_SIZE, ACTION_HEADER_SIZE + PAYLOAD_SIZE_BYTES);
    
    const action = new TextDecoder().decode(actionBytes).trim();
    const payloadSizeView = new DataView(payloadSizeBytes.buffer, payloadSizeBytes.byteOffset, payloadSizeBytes.byteLength);
    const payloadSize = payloadSizeView.getUint32(0, false);
    
    if (PROTOCOL_HEADER_SIZE + payloadSize > data.length) {
        throw new Error(`Payload size mismatch: expected ${payloadSize} bytes, but only ${data.length - PROTOCOL_HEADER_SIZE} available`);
    }
    
    const payload = data.slice(PROTOCOL_HEADER_SIZE, PROTOCOL_HEADER_SIZE + payloadSize);
    return { action, payload };
}

/**
 * 编码文本载荷
 */
function encodeTextPayload(text: string): Uint8Array {
    return new TextEncoder().encode(text);
}

/**
 * 解码文本载荷
 */
function decodeTextPayload(payload: Uint8Array): string {
    return new TextDecoder().decode(payload);
}

export interface StreamingTTSEvents {
    onConnected?: () => void;
    onEngineReady?: () => void;
    onStreamStarted?: () => void;
    onAudioChunk?: (audioData: Uint8Array) => void;
    onStreamEnded?: () => void;
    onError?: (error: string) => void;
    onDisconnected?: () => void;
}

export class StreamingTTSWebsocketClient {
    private _ws: WebSocket | null = null;
    private _url: string;
    private _engine: string;
    private _config: any;
    private _events: StreamingTTSEvents;
    private _isConnected: boolean = false;
    private _isEngineReady: boolean = false;
    private _textQueue: string[] = [];
    private _isProcessing: boolean = false;

    constructor(
        engine: string,
        config: any,
        events: StreamingTTSEvents = {}
    ) {
        const path = `/adh/stream_tts/v0/ws`;
        this._url = getWsUrl(path);
        this._engine = engine;
        this._config = config;
        this._events = events;
    }

    /**
     * 连接到WebSocket服务器
     */
    public async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this._ws = new WebSocket(this._url);
                this._ws.binaryType = 'arraybuffer';

                this._ws.onopen = () => {
                    console.log('TTS WebSocket连接已建立');
                    this._isConnected = true;
                    
                    if (this._events.onConnected) {
                        this._events.onConnected();
                    }
                    resolve();
                };

                this._ws.onmessage = (event) => {
                    if (event.data instanceof ArrayBuffer) {
                        this._handleBinaryMessage(new Uint8Array(event.data));
                    }
                };

                this._ws.onclose = () => {
                    console.log('TTS WebSocket连接已关闭');
                    this._isConnected = false;
                    this._isEngineReady = false;
                    if (this._events.onDisconnected) {
                        this._events.onDisconnected();
                    }
                };

                this._ws.onerror = (error) => {
                    console.error('TTS WebSocket错误:', error);
                    reject(new Error('WebSocket连接失败'));
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 断开WebSocket连接
     */
    public disconnect(): void {
        if (this._ws) {
            this._sendMessage(TTS_ACTION_TYPE.END_STREAM);
            this._ws.close();
            this._ws = null;
        }
        this._isConnected = false;
        this._isEngineReady = false;
        this._textQueue = [];
        this._isProcessing = false;
    }

    /**
     * 发送文本进行TTS合成
     */
    public async synthesizeText(text: string): Promise<void> {
        if (!this._isConnected || !this._isEngineReady) {
            throw new Error('WebSocket未连接或引擎未就绪');
        }

        this._textQueue.push(text);
        this._processTextQueue();
    }

    /**
     * 检查是否已连接且引擎就绪
     */
    public isReady(): boolean {
        return this._isConnected && this._isEngineReady;
    }

    /**
     * 发送消息
     */
    private _sendMessage(action: string, payload: Uint8Array = new Uint8Array(0)): void {
        if (this._ws && this._ws.readyState === WebSocket.OPEN) {
            const message = createBinaryMessage(action, payload);
            this._ws.send(message);
        }
    }

    /**
     * 处理二进制消息
     */
    private _handleBinaryMessage(data: Uint8Array): void {
        try {
            const { action, payload } = parseBinaryMessage(data);
            
            switch (action) {
                case TTS_ACTION_TYPE.CONNECTION_ACK:
                    const ackMsg = decodeTextPayload(payload);
                    console.log('TTS连接确认:', ackMsg);
                    break;
                    
                case TTS_ACTION_TYPE.ENGINE_READY:
                    const readyMsg = decodeTextPayload(payload);
                    console.log('TTS引擎就绪:', readyMsg);
                    this._isEngineReady = true;
                    if (this._events.onEngineReady) {
                        this._events.onEngineReady();
                    }
                    break;
                    
                case TTS_ACTION_TYPE.STREAM_STARTED:
                    const startMsg = decodeTextPayload(payload);
                    console.log('TTS流开始:', startMsg);
                    if (this._events.onStreamStarted) {
                        this._events.onStreamStarted();
                    }
                    break;
                    
                case TTS_ACTION_TYPE.AUDIO_CHUNK:
                    console.log('收到TTS音频块:', payload.length, '字节');
                    if (this._events.onAudioChunk) {
                        this._events.onAudioChunk(payload);
                    }
                    break;
                    
                case TTS_ACTION_TYPE.STREAM_ENDED:
                    const endMsg = decodeTextPayload(payload);
                    console.log('TTS流结束:', endMsg);
                    this._isProcessing = false;
                    if (this._events.onStreamEnded) {
                        this._events.onStreamEnded();
                    }
                    // 继续处理队列中的下一个文本
                    this._processTextQueue();
                    break;
                    
                case TTS_ACTION_TYPE.ERROR:
                    const errorMsg = decodeTextPayload(payload);
                    console.error('TTS错误:', errorMsg);
                    this._isProcessing = false;
                    if (this._events.onError) {
                        this._events.onError(errorMsg);
                    }
                    break;
                    
                case TTS_ACTION_TYPE.PONG:
                    console.log('收到TTS PONG响应');
                    break;
                    
                default:
                    console.warn('未知TTS动作类型:', action);
            }
        } catch (error) {
            console.error('解析TTS消息错误:', error);
            if (this._events.onError) {
                this._events.onError(`消息解析错误: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }

    /**
     * 处理文本队列
     */
    private _processTextQueue(): void {
        if (this._isProcessing || this._textQueue.length === 0 || !this._isEngineReady) {
            return;
        }

        this._isProcessing = true;
        const text = this._textQueue.shift()!;
        
        console.log('发送TTS文本:', text);
        // 先发送开始流消息，将服务端状态设置为PROCESSING
        const startPayload = JSON.stringify({
            engine: this._engine,
            config: this._config
        });
        this._sendMessage(TTS_ACTION_TYPE.START_STREAM, encodeTextPayload(startPayload));
        // 然后发送文本块
        this._sendMessage(TTS_ACTION_TYPE.TEXT_CHUNK, encodeTextPayload(text));
        // 最后发送结束流消息，告知服务端文本发送完成
        this._sendMessage(TTS_ACTION_TYPE.END_STREAM);
    }

    /**
     * 发送心跳
     */
    public ping(): void {
        this._sendMessage(TTS_ACTION_TYPE.PING);
    }
}

/**
 * 创建流式TTS WebSocket客户端
 */
export function createStreamingTTSClient(
    engine: string,
    config: any,
    events: StreamingTTSEvents = {}
): StreamingTTSWebsocketClient {
    return new StreamingTTSWebsocketClient(engine, config, events);
}