import { getWsUrl } from "./requests";

// 协议常量定义（与服务端保持一致）
const ACTION_HEADER_SIZE = 18;
const PROTOCOL_HEADER_FORMAT = ">18sI"; // 大端序: 18字节action + 4字节无符号整数payload_size
const PROTOCOL_HEADER_SIZE = 22; // 18 + 4

export enum WS_SEND_ACTION_TYPE {
    "PING" = "PING",  // 心跳包
    "ENGINE_START" = "ENGINE_START",  // 启动引擎
    "ENGINE_PARTIAL_INPUT" = "PARTIAL_INPUT",  // 引擎输入
    "ENGINE_FINAL_INPUT" = "FINAL_INPUT",  // 引擎输入
    "ENGINE_STOP" = "ENGINE_STOP",  // 停止引擎
}

export enum WS_RECV_ACTION_TYPE {
    "PONG" = "PONG",  // 心跳响应
    "ENGINE_INITIALZING" = "ENGINE_INITIALZING",  // 引擎初始化
    "ENGINE_STARTED" = "ENGINE_STARTED",  // 引擎准备就绪
    "ENGINE_PARTIAL_OUTPUT" = "PARTIAL_OUTPUT",  // 引擎输出
    "ENGINE_FINAL_OUTPUT" = "FINAL_OUTPUT",  // 引擎输出
    "ENGINE_STOPPED" = "ENGINE_STOPPED",  // 关闭引擎
    "ERROR" = "ERROR",  // 错误响应
}

/**
 * 格式化action名称为18字节，右侧用空格填充
 */
function _format_action(actionName: string): Uint8Array {
    if (actionName.length > ACTION_HEADER_SIZE) {
        throw new Error(`Action name '${actionName}' exceeds ${ACTION_HEADER_SIZE} bytes`);
    }
    const padded = actionName.padEnd(ACTION_HEADER_SIZE, ' ');
    return new TextEncoder().encode(padded);
}


/**
 * 解析二进制消息，返回{action, payload}
 */
function parse_message(data: ArrayBuffer): { action: string; payload: Uint8Array } {
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
    return { action: new TextDecoder().decode(action).trim(), payload: payload };
}

/**
 * 创建二进制消息
 */
function struct_message(action: string, payload: string | Uint8Array = new Uint8Array(0)): ArrayBuffer {
    // 判断pauload类型
    if (typeof payload === 'string') {
        payload = new TextEncoder().encode(payload);
    }
    const actionData = _format_action(action);
    if (actionData.length !== ACTION_HEADER_SIZE) {
        throw new Error(
            `Action must be exactly ${ACTION_HEADER_SIZE} bytes, got ${actionData.length}`
        );
    }

    const payloadSize = payload.length;
    const totalSize = PROTOCOL_HEADER_SIZE + payloadSize;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    
    // 写入action (18字节)
    new Uint8Array(buffer, 0, ACTION_HEADER_SIZE).set(actionData);
    
    // 写入payload大小 (4字节，大端序)
    view.setUint32(ACTION_HEADER_SIZE, payloadSize, false);
    
    // 写入payload
    if (payloadSize > 0) {
        new Uint8Array(buffer, PROTOCOL_HEADER_SIZE, payloadSize).set(payload);
    }
    
    return buffer;
}

export class WebsocketClient {
    private _ws: WebSocket | null = null;
    private _url: string;
    private _engine: string;
    private _config: {};
    private _onMessage?: (action: string, data: Uint8Array) => void;
    private _onOpen?: () => void;
    private _onClose?: () => void;
    private _onError?: (error: Error) => void;

    constructor(
        url: string,
        engine: string,
        config: {},
        onMessage?:  (action: string, data: Uint8Array) => void,
        onOpen?: () => void,
        onClose?: () => void,
        onError?: (error: Error) => void
    ) {
        this._url = url;
        this._engine = engine;
        this._config = config;
        this._onMessage = onMessage;
        this._onOpen = onOpen;
        this._onClose = onClose;
        this._onError = onError;
    }

    public connect() {
        this._ws = new WebSocket(this._url);
        this._ws.binaryType = 'arraybuffer';
        this._ws.onopen = () => {
            const payload = JSON.stringify({
                engine: this._engine,
                config: this._config
            });
            this.sendMessage(WS_SEND_ACTION_TYPE.ENGINE_START, payload);
            if (this._onOpen) {
                this._onOpen();
            }
        };
        this._ws.onmessage = (event) => {
            if (this._onMessage) {
                const { action, payload } = parse_message(event.data);
                this._onMessage(action as string, payload);
            }
        };
        this._ws.onclose = () => {
            this.sendMessage(WS_SEND_ACTION_TYPE.ENGINE_STOP);
            if (this._onClose) {
                this._onClose();
            }
        };
        this._ws.onerror = (error) => {
            if (this._onError) {
                this._onError(new Error(`WebSocket error: ${error.target}`));
            }
        }
    }

    public disconnect() {
        if (this._ws) {
            this._ws.close();
            this._ws = null;
        }
    }

    public isConnected() {
        return this._ws && this._ws.readyState === WebSocket.OPEN;
    }

    public sendMessage(action: string, payload: string | Uint8Array = new Uint8Array(0)) {
        const data = struct_message(action, payload);
        if (this._ws && this._ws.readyState === WebSocket.OPEN) {
            this._ws.send(data);
        } else {
            // throw new Error('WebSocket is not connected');
        }
    }
}

export function createASRWebsocketClient(
    events: {
        engine: string,
        config: {},
        onMessage?: (action: string, data: Uint8Array) => void,
        onOpen?: () => void,
        onClose?: () => void,
        onError?: (error: Error) => void
    }
) {
    const path = `/adh/asr/v0/engine/stream`;
    const url = getWsUrl(path);
    return new WebsocketClient(
        url,
        events.engine,
        events.config,
        events.onMessage,
        events.onOpen,
        events.onClose,
        events.onError
    );
}