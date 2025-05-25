'use client';
// import Image from "next/image";
import clsx from "clsx";
import { debounce } from 'lodash';
import { useEffect, useRef, useState } from "react";
import { useChatRecordStore, ChatRole, ChatMessage, useAgentEngineSettingsStore, useAgentModeStore, useMuteStore, useInteractionModeStore, InteractionMode, useAudioAutoStopStore, useStreamingASRStore } from "@/app/lib/store";
import { ConfirmAlert } from "@/app/ui/common/alert";
import { AUDIO_SUPPORT_ALERT, AI_THINK_MESSAGE } from "@/app/lib/constants";
import { Comm } from "@/app/lib/comm";
import { CharacterManager } from "@/app/lib/character";
import Recorder from "js-audio-recorder";
import Markdown from 'react-markdown';
import { getURL } from '@/app/lib/api';


// 移除重复的全局变量声明，使用React状态管理


export default function Chatbot(props: { showChatHistory: boolean }) {
    const { showChatHistory } = props;
    const { chatRecord, addChatRecord, updateLastRecord, clearChatRecord } = useChatRecordStore();
    const { mute } = useMuteStore();
    const { agentEngine } = useAgentModeStore();
    const { mode } = useInteractionModeStore();
    const { agentSettings } = useAgentEngineSettingsStore();
    const { audioAutoStop } = useAudioAutoStopStore();
    const [settings, setSettings] = useState<{[key: string]: string}>({});
    const [conversationId, setConversationId] = useState("");
    const [micRecording, setMicRecording] = useState(false);
    const [micRecordAlert, setmicRecordAlert] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const chatbotRef = useRef<HTMLDivElement>(null);
    
    // 从store获取流式ASR设置
    const { useStreamingASR } = useStreamingASRStore();
    
    // 流式ASR相关状态
    const [isStreamingASR, setIsStreamingASR] = useState(false);
    const [streamingTranscript, setStreamingTranscript] = useState("");
    
    // 传统录音相关状态
    const [isRecording, setIsRecording] = useState(false);
    const [micRecorder, setMicRecorder] = useState<Recorder | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const CHUNK_SIZE_BYTES = 7680 * 2; // 15360字节，与测试文件保持一致
    const SAMPLE_RATE = 16000; // 采样率
    const CHANNELS = 1; // 单声道
    const BYTES_PER_SAMPLE = 2; // 16位 = 2字节
    
    // 音频处理相关引用
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioBufferRef = useRef<Int16Array>(new Int16Array(0));
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);

    useEffect(() => {
        let newSettings: {[key: string]: string} = {}
        if (agentEngine in agentSettings) {
            for (let setting of agentSettings[agentEngine]){
                newSettings[setting.NAME] = setting.DEFAULT;
            }
            setSettings(newSettings);
        }
        Comm.getInstance().getConversionId(agentEngine, newSettings).then((id) => {
            // 设置对话ID
            setConversationId(id);
        });
        clearChatRecord();
        
        // 清理函数 - 在组件重新渲染时安全清理资源
        const cleanup = async () => {
            console.log('开始清理音频资源，当前状态:', {
                isStreamingASR,
                micRecording,
                wsConnected: wsRef.current?.readyState === WebSocket.OPEN,
                bufferSize: audioBufferRef.current?.length || 0
            });
            
            // 如果正在进行流式录音，先尝试发送最终数据（即使缓冲区为空也要发送静音音频）
            if (isStreamingASR && audioBufferRef.current) {
                console.log('检测到正在进行流式录音，尝试发送 FINAL_CHUNK');
                
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    try {
                        const samplesPerChunk = CHUNK_SIZE_BYTES / BYTES_PER_SAMPLE;
                        const paddedData = new Int16Array(samplesPerChunk);
                        
                        if (audioBufferRef.current.length > 0) {
                            // 如果缓冲区有数据，使用实际数据
                            paddedData.set(audioBufferRef.current);
                            console.log('清理时发送实际音频数据作为 FINAL_CHUNK');
                        } else {
                            // 如果缓冲区为空，发送静音数据（全零）
                            console.log('清理时缓冲区为空，发送静音音频作为 FINAL_CHUNK');
                        }
                        
                        const byteArray = new Uint8Array(paddedData.buffer);
                        const finalMessage = createBinaryMessage(ActionType.FINAL_CHUNK, byteArray);
                        wsRef.current.send(finalMessage);
                        console.log('清理时发送 FINAL_CHUNK 成功');
                        
                        // 发送结束消息
                        const endMessage = createBinaryMessage(ActionType.END_STREAM);
                        wsRef.current.send(endMessage);
                        console.log('清理时发送 END_STREAM 成功');
                    } catch (error) {
                        console.error('清理时发送最终数据失败:', error);
                    }
                }
            }
            
            // 清理WebSocket连接
            if (wsRef.current) {
                console.log('关闭 WebSocket 连接');
                wsRef.current.close();
                wsRef.current = null;
            }
            
            // 清理音频处理器
            if (processorRef.current) {
                console.log('断开音频处理器');
                processorRef.current.disconnect();
                processorRef.current = null;
            }
            
            // 停止麦克风轨道
            if (mediaStreamRef.current) {
                console.log('停止媒体流轨道');
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
                mediaStreamRef.current = null;
            }
            
            // 清理AudioContext
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                console.log('关闭 AudioContext');
                try {
                    await audioContextRef.current.close();
                } catch (error) {
                    console.error('关闭 AudioContext 失败:', error);
                }
                audioContextRef.current = null;
            }
            
            // 清空音频缓冲区
            audioBufferRef.current = new Int16Array(0);
            console.log('音频资源清理完成');
        };
        
        cleanup();
    }, [agentEngine, agentSettings]);

    const chatWithAI = (message: string, options: {
        addUserMessage?: boolean;
        enableStreamingTTS?: boolean;
        enableFinalTTS?: boolean;
    } = {}) => {
        const {
            addUserMessage = true,
            enableStreamingTTS = true,
            enableFinalTTS = true
        } = options;
        
        // 开始AI对话
        
        // 根据参数决定是否添加用户消息
        if (addUserMessage) {
            addChatRecord({ role: ChatRole.HUMAN, content: message });
        }
        
        // 请求AI
        let responseText = "";
        let audioText = "";
        // 保证顺序执行
        let audioRecorderIndex = 0;
        let audioRecorderDict = new Map<number, ArrayBuffer>();
        addChatRecord({ role: ChatRole.AI, content: AI_THINK_MESSAGE });
        if (audioAutoStop) {
            CharacterManager.getInstance().clearAudioQueue();
        }
        Comm.getInstance().streamingChat(message, agentEngine, conversationId, settings, (index: number, data: string) => {
            responseText += data;
            updateLastRecord({ role: ChatRole.AI, content: responseText });
            
            // 根据参数决定是否启用流式TTS
            if (!mute && mode != InteractionMode.CHATBOT && enableStreamingTTS) {
                // 按照标点符号断句处理
                audioText += data;
                // 断句判断符号
                // let punc = ["。", ".", "！", "!", "？", "?", "；", ";", "，", ",", "(", ")", "（", "）"];
                let punc = ["。", ".", "？", "?", "；", ";", "，", ","];
                // 找到最后一个包含这些符号的位置
                let lastPuncIndex = -1;
                for (let i = 0; i < punc.length; i++) {
                    let index = audioText.lastIndexOf(punc[i]);
                    if (index > lastPuncIndex) {
                        // 防止需要连续的符号断句
                        let firstPart = audioText.slice(0, index + 1);
                        if (firstPart.split("(").length - firstPart.split(")").length != 0) {
                            break;
                        }
                        if (firstPart.split("[").length - firstPart.split("]").length != 0) {
                            break;
                        }
                        lastPuncIndex = index;
                        break;
                    }
                }
                if (lastPuncIndex !== -1) {
                    let firstPart = audioText.slice(0, lastPuncIndex + 1);
                    let secondPart = audioText.slice(lastPuncIndex + 1);
                    // 处理首个TTS片段
                    Comm.getInstance().tts(firstPart, settings).then(
                        (data: ArrayBuffer) => {
                            if (data) {
                                audioRecorderDict.set(index, data);
                                while (true) {
                                    if (!audioRecorderDict.has(audioRecorderIndex)) break;
                                    CharacterManager.getInstance().pushAudioQueue(audioRecorderDict.get(audioRecorderIndex)!);
                                    audioRecorderIndex++;
                                }
                            }
                        }
                    )
                    audioText = secondPart;
                } else {
                    audioRecorderDict.set(index, null)
                }
            }
        }, (index: number) => {
            // 根据参数决定是否处理最终TTS
            if (!mute && enableFinalTTS) {
                if (enableStreamingTTS && audioText) {
                    // 流式TTS模式：处理剩余文本
                    // 处理TTS片段
                    Comm.getInstance().tts(audioText, settings).then(
                        (data: ArrayBuffer) => {
                            if (data) {
                                audioRecorderDict.set(index, data);
                                while (true) {
                                    if (!audioRecorderDict.has(audioRecorderIndex)) break;
                                    CharacterManager.getInstance().pushAudioQueue(audioRecorderDict.get(audioRecorderIndex)!);
                                    audioRecorderIndex++;
                                }
                            }
                        }
                    )
                } else if (!enableStreamingTTS && responseText.trim()) {
                    // 非流式TTS模式：对完整回复进行TTS
                    // 处理完整TTS
                    Comm.getInstance().tts(responseText, settings).then(
                        (data: ArrayBuffer) => {
                            if (data) {
                                CharacterManager.getInstance().pushAudioQueue(data);
                            }
                        }
                    );
                }
            }
            setIsProcessing(false);
        });
    }


    const micClick = async () => {
        // 改进防重复点击逻辑 - 只在非录音状态下阻止重复点击
        if (isProcessing && !micRecording && !isStreamingASR) {
            return;
        }
        
        if (useStreamingASR) {
            // 使用流式ASR模式
            await handleStreamingASR();
        } else {
            // 使用传统录音模式
            handleTraditionalRecording();
        }
    };

    // 流式ASR处理函数
    const handleStreamingASR = async () => {
        if (!isStreamingASR) {
            // 开始流式录音
            console.log('开始流式ASR录音，当前状态:', {
                isStreamingASR,
                micRecording,
                isProcessing,
                wsConnected: wsRef.current?.readyState === WebSocket.OPEN,
                bufferSize: audioBufferRef.current?.length || 0
            });
            
            try {
                setIsProcessing(true);
                
                // 重置音频缓冲区
                audioBufferRef.current = new Int16Array(0);
                console.log('音频缓冲区已重置');
                
                // 连接WebSocket
                console.log('正在连接 WebSocket...');
                await connectStreamingASR();
                console.log('WebSocket 连接成功');
                
                if (audioAutoStop) {
                    CharacterManager.getInstance().clearAudioQueue();
                }
                
                // 获取麦克风权限
                console.log('正在获取麦克风权限...');
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        sampleRate: SAMPLE_RATE,
                        channelCount: CHANNELS,
                        echoCancellation: false, // 关闭回声消除以获得原始音频
                        noiseSuppression: false, // 关闭噪声抑制
                        autoGainControl: false   // 关闭自动增益控制
                    }
                });
                
                // 保存stream引用以便后续停止
                mediaStreamRef.current = stream;
                
                // 创建AudioContext用于处理音频数据
                audioContextRef.current = new AudioContext({
                    sampleRate: SAMPLE_RATE
                });
                
                const source = audioContextRef.current.createMediaStreamSource(stream);
                
                // 创建ScriptProcessorNode来获取原始音频数据
                const bufferSize = 4096; // 处理缓冲区大小
                const processor = audioContextRef.current.createScriptProcessor(bufferSize, CHANNELS, CHANNELS);
                processorRef.current = processor;
                
                processor.onaudioprocess = (event) => {
                    // 检查音频上下文状态 - 如果已关闭则停止处理
                    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                        console.log('AudioContext 已关闭，停止音频处理');
                        return;
                    }
                    
                    // 检查媒体流和处理器状态 - 如果不存在则停止处理
                    if (!mediaStreamRef.current || !processorRef.current) {
                        console.log('媒体流或处理器不存在，停止音频处理');
                        return;
                    }
                    
                    const inputBuffer = event.inputBuffer;
                    const inputData = inputBuffer.getChannelData(0); // 获取第一个声道的数据
                    
                    // 将Float32Array转换为Int16Array (PCM 16位)
                    const pcmData = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        // 将-1到1的浮点数转换为-32768到32767的整数
                        const sample = Math.max(-1, Math.min(1, inputData[i]));
                        pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                    }
                    
                    // 将新数据添加到缓冲区 - 无论WebSocket状态如何都要收集数据
                    const newBuffer = new Int16Array(audioBufferRef.current.length + pcmData.length);
                    newBuffer.set(audioBufferRef.current);
                    newBuffer.set(pcmData, audioBufferRef.current.length);
                    audioBufferRef.current = newBuffer;
                    
                    // 只有在WebSocket连接正常时才发送数据块
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        // 检查是否有足够的数据发送一个chunk
                        while (audioBufferRef.current.length * BYTES_PER_SAMPLE >= CHUNK_SIZE_BYTES) {
                            const samplesPerChunk = CHUNK_SIZE_BYTES / BYTES_PER_SAMPLE;
                            const chunkData = audioBufferRef.current.slice(0, samplesPerChunk);
                            
                            // 转换为字节数组并使用二进制协议发送
                            const byteArray = new Uint8Array(chunkData.buffer);
                            const audioMessage = createBinaryMessage(ActionType.AUDIO_CHUNK, byteArray);
                            
                            try {
                                wsRef.current.send(audioMessage);
                                // 移除已发送的数据
                                audioBufferRef.current = audioBufferRef.current.slice(samplesPerChunk);
                            } catch (error) {
                                console.error('发送 PCM 音频块失败:', error);
                                // 发送失败时不移除数据，保留在缓冲区中
                                break;
                            }
                        }
                    } else {
                        // WebSocket连接不正常时，只记录一次警告（避免日志过多）
                        if (!processor.wsWarningLogged) {
                            console.warn(`WebSocket 连接状态异常 (${wsRef.current?.readyState})，音频数据将缓存等待发送`);
                            processor.wsWarningLogged = true;
                        }
                    }
                };
                
                // 连接音频节点
                source.connect(processor);
                processor.connect(audioContextRef.current.destination);
                
                // 发送开始流式识别消息
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    const startMessage = createBinaryMessage(ActionType.START_STREAM);
                    wsRef.current.send(startMessage);
                } else {
                    console.error('Cannot send START_STREAM: WebSocket not ready');
                }
                
                // 初始化音频缓冲区
                audioBufferRef.current = new Int16Array(0);
                setStreamingTranscript(""); // 清空之前的识别结果
                setIsStreamingASR(true);
                setMicRecording(true);
                setIsProcessing(false);
                
            } catch (error) {
                console.error('Failed to start streaming ASR:', error);
                setmicRecordAlert(true);
                setIsProcessing(false);
            }
        } else {
            // 停止流式录音
            setIsStreamingASR(false);
            setMicRecording(false);
            setIsProcessing(true);
            
            try {
                // 按正确顺序清理音频资源
                // 1. 先断开音频处理器
                if (processorRef.current) {
                    processorRef.current.onaudioprocess = null; // 清除事件处理器
                    processorRef.current.disconnect();
                    processorRef.current = null;
                }
                
                // 2. 停止麦克风轨道
                if (mediaStreamRef.current) {
                    mediaStreamRef.current.getTracks().forEach(track => track.stop());
                    mediaStreamRef.current = null;
                }
                
                // 3. 关闭AudioContext
                if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                    await audioContextRef.current.close();
                    audioContextRef.current = null;
                }
            } catch (error) {
                console.error('Error during audio cleanup:', error);
            }
            
            // 发送剩余的音频数据 - 改进版本，增加重试机制和更详细的日志
            // 即使缓冲区为空也要发送 FINAL_CHUNK（发送静音音频）
            const sendFinalChunk = async (retryCount = 0) => {
                const maxRetries = 3;
                const retryDelay = 100; // 100ms
                
                console.log(`尝试发送 FINAL_CHUNK，缓冲区大小: ${audioBufferRef.current.length}, WebSocket状态: ${wsRef.current?.readyState}, 重试次数: ${retryCount}`);
                
                // 准备要发送的音频数据
                const samplesPerChunk = CHUNK_SIZE_BYTES / BYTES_PER_SAMPLE;
                const paddedData = new Int16Array(samplesPerChunk);
                
                if (audioBufferRef.current.length > 0) {
                    // 如果缓冲区有数据，使用实际数据
                    paddedData.set(audioBufferRef.current);
                    console.log('发送实际音频数据作为 FINAL_CHUNK');
                } else {
                    // 如果缓冲区为空，发送静音数据（全零）
                    // paddedData 已经是全零的 Int16Array，无需额外操作
                    console.log('缓冲区为空，发送静音音频作为 FINAL_CHUNK');
                }
                
                const byteArray = new Uint8Array(paddedData.buffer);
                const finalMessage = createBinaryMessage(ActionType.FINAL_CHUNK, byteArray);
                
                // 即使 WebSocket 状态不是 OPEN，也尝试发送（可能正在连接中）
                if (wsRef.current) {
                    try {
                        wsRef.current.send(finalMessage);
                        console.log('FINAL_CHUNK 发送成功');
                    } catch (error) {
                        console.error(`发送 FINAL_CHUNK 失败 (尝试 ${retryCount + 1}/${maxRetries + 1}):`, error);
                        
                        // 如果发送失败且还有重试次数，则重试
                        if (retryCount < maxRetries) {
                            setTimeout(() => {
                                sendFinalChunk(retryCount + 1);
                            }, retryDelay * (retryCount + 1)); // 递增延迟
                            return;
                        }
                    }
                } else {
                    console.warn('WebSocket 连接不存在，无法发送 FINAL_CHUNK');
                }
            };
            
            // 执行发送最终音频块
            await sendFinalChunk();
            
            // 清空音频缓冲区
            audioBufferRef.current = new Int16Array(0);
            
            // 发送结束流式识别消息 - 也增加重试机制
            const sendEndStream = async (retryCount = 0) => {
                const maxRetries = 2;
                const retryDelay = 50;
                
                if (wsRef.current) {
                    try {
                        const endMessage = createBinaryMessage(ActionType.END_STREAM);
                        wsRef.current.send(endMessage);
                        console.log('END_STREAM 发送成功');
                    } catch (error) {
                        console.error(`发送 END_STREAM 失败 (尝试 ${retryCount + 1}/${maxRetries + 1}):`, error);
                        
                        if (retryCount < maxRetries) {
                            setTimeout(() => {
                                sendEndStream(retryCount + 1);
                            }, retryDelay * (retryCount + 1));
                        }
                    }
                }
            };
            
            await sendEndStream();
            
            setStreamingTranscript("");
            setIsProcessing(false);
        }
    };

    // 传统录音处理函数
    const handleTraditionalRecording = () => {
        // 初始化录音器配置
        const recorderConfig = {
            sampleBits: 16,
            sampleRate: 16000,
            numChannels: 1,
        };
        
        if (!isRecording) {
            // 开始录音
            if (audioAutoStop) {
                CharacterManager.getInstance().clearAudioQueue();
            }
            
            // 确保使用同一个录音器实例
            let currentRecorder = micRecorder;
            if (!currentRecorder) {
                currentRecorder = new Recorder(recorderConfig);
                setMicRecorder(currentRecorder);
            }
            
            currentRecorder.start().then(
                () => {
                    setIsRecording(true);
                    setMicRecording(true);
                },
                (error) => {
                    console.error('Failed to start traditional recording:', error);
                    setmicRecordAlert(true);
                }
            );
        } else {
            // 停止录音
            if (micRecorder) {
                // 先更新状态
                setIsRecording(false);
                setMicRecording(false);
                setIsProcessing(true);
                
                // 确保录音时长足够（给录音器一点时间完成最后的数据收集）
                setTimeout(() => {
                    micRecorder.stop();
                    
                    const wavBlob = micRecorder.getWAVBlob();
                    
                    // 检查音频数据大小
                    if (wavBlob.size < 1000) { // 小于1KB可能是无效录音
                        console.warn('录音数据过小，可能录音时间不足，音频大小:', wavBlob.size);
                        setIsProcessing(false);
                        return;
                    }
                    
                    console.log('录音完成，音频大小:', wavBlob.size);
                    
                    Comm.getInstance().asr(wavBlob, settings, "default", "wav", 16000, 2).then(
                        (res) => {
                            if (res) {
                                chatWithAI(res);
                            } else {
                                setIsProcessing(false);
                            }
                        }
                    ).catch(
                        (error) => {
                            console.error('ASR failed:', error);
                            setIsProcessing(false);
                        }
                    );
                }, 100); // 给录音器100ms时间完成最后的数据收集
            } else {
                console.error('录音器实例不存在');
                setIsRecording(false);
                setMicRecording(false);
                setIsProcessing(false);
            }
        }
    };

    // 协议常量定义
    const ACTION_HEADER_SIZE = 18;
    const MAX_PAYLOAD_SIZE = 23040; // 7680 * 3
    const PROTOCOL_HEADER_SIZE = 22; // 18字节action + 4字节payload_size (大端序)
    
    // 格式化action名称为18字节，右侧用空格填充
    const formatAction = (actionName: string): Uint8Array => {
        if (actionName.length > ACTION_HEADER_SIZE) {
            throw new Error(`Action name '${actionName}' exceeds ${ACTION_HEADER_SIZE} bytes`);
        }
        return new TextEncoder().encode(actionName.padEnd(ACTION_HEADER_SIZE, ' '));
    };
    
    // Action类型定义
    const ActionType = {
        // 客户端请求类型
        START_STREAM: formatAction('START_STREAM'),      // 开始流式识别
        AUDIO_CHUNK: formatAction('AUDIO_CHUNK'),        // 普通音频数据块
        FINAL_CHUNK: formatAction('FINAL_CHUNK'),        // 最终音频数据块
        END_STREAM: formatAction('END_STREAM'),          // 结束流式识别
        PING: formatAction('PING'),                      // 心跳包
        
        // 服务端响应类型
        CONNECTION_ACK: formatAction('CONNECTION_ACK'),       // 连接确认
        ENGINE_READY: formatAction('ENGINE_READY'),           // 引擎就绪
        STREAM_STARTED: formatAction('STREAM_STARTED'),       // 流开始确认
        PARTIAL_TRANSCRIPT: formatAction('PARTIAL_TRANSCRIPT'), // 部分识别结果
        FINAL_TRANSCRIPT: formatAction('FINAL_TRANSCRIPT'),   // 最终识别结果
        STREAM_ENDED: formatAction('STREAM_ENDED'),           // 流结束确认
        ERROR: formatAction('ERROR'),                         // 错误信息
        PONG: formatAction('PONG')                            // 心跳响应
    };
    
    // 解析二进制消息（使用struct格式）
    const parseBinaryMessage = (data: ArrayBuffer) => {
        if (data.byteLength < PROTOCOL_HEADER_SIZE) {
            throw new Error('Message too short');
        }
        
        const view = new DataView(data);
        
        // 读取18字节的action
        const actionBytes = new Uint8Array(data, 0, ACTION_HEADER_SIZE);
        
        // 读取4字节的payload大小（大端序）
        const payloadSize = view.getUint32(ACTION_HEADER_SIZE, false);
        
        // 验证payload大小
        if (payloadSize > MAX_PAYLOAD_SIZE) {
            throw new Error(`Payload size ${payloadSize} exceeds maximum ${MAX_PAYLOAD_SIZE}`);
        }
        
        if (data.byteLength < PROTOCOL_HEADER_SIZE + payloadSize) {
            throw new Error('Incomplete message');
        }
        
        // 读取payload
        const payload = payloadSize > 0 ? new Uint8Array(data, PROTOCOL_HEADER_SIZE, payloadSize) : new Uint8Array(0);
        
        return {
            action: actionBytes,
            payload: payload,
            payloadSize: payloadSize
        };
    };
    
    // 创建二进制消息（使用struct格式）
    const createBinaryMessage = (actionType: Uint8Array, payload?: Uint8Array) => {
        const payloadSize = payload ? payload.length : 0;
        
        // 验证payload大小
        if (payloadSize > MAX_PAYLOAD_SIZE) {
            throw new Error(`Payload size ${payloadSize} exceeds maximum ${MAX_PAYLOAD_SIZE}`);
        }
        
        const message = new Uint8Array(PROTOCOL_HEADER_SIZE + payloadSize);
        const view = new DataView(message.buffer);
        
        // 设置18字节的action
        message.set(actionType, 0);
        
        // 设置4字节的payload大小（大端序）
        view.setUint32(ACTION_HEADER_SIZE, payloadSize, false);
        
        // 设置payload
        if (payload && payloadSize > 0) {
            message.set(payload, PROTOCOL_HEADER_SIZE);
        }
        
        return message;
    };
    
    // 比较action类型（18字节）
    const compareAction = (action1: Uint8Array, action2: Uint8Array): boolean => {
        if (action1.length !== ACTION_HEADER_SIZE || action2.length !== ACTION_HEADER_SIZE) {
            return false;
        }
        for (let i = 0; i < ACTION_HEADER_SIZE; i++) {
            if (action1[i] !== action2[i]) return false;
        }
        return true;
    };
    
    // 解码文本payload
    const decodeTextPayload = (payload: Uint8Array): string => {
        return new TextDecoder('utf-8').decode(payload);
    };
    
    // 连接WebSocket
    const connectStreamingASR = (): Promise<boolean> => {
        return new Promise((resolve, reject) => {
            // 检查现有连接状态，如果不是OPEN状态就重新连接
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                resolve(true);
                return;
            }

            // 如果存在旧连接但状态不是OPEN，先关闭它
            if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
                wsRef.current.close();
                wsRef.current = null;
            }

            const httpUrl = getURL() + "/adh/streaming_asr/ws/asr/v0/stream";
            const wsUrl = httpUrl.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
            wsRef.current = new WebSocket(wsUrl);
            wsRef.current.binaryType = 'arraybuffer'; // 设置为接收二进制数据

            // 设置连接超时
            const timeout = setTimeout(() => {
                if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
                    wsRef.current.close();
                    reject(new Error('WebSocket connection timeout'));
                }
            }, 10000); // 10秒超时

            wsRef.current.onopen = () => {
                clearTimeout(timeout);
                resolve(true);
            };

            wsRef.current.onmessage = (event) => {
                try {
                    // 处理二进制消息
                    if (event.data instanceof ArrayBuffer) {
                        const { action, payload } = parseBinaryMessage(event.data);
                        const payloadText = payload.length > 0 ? decodeTextPayload(payload) : '';
                        
                        if (compareAction(action, ActionType.CONNECTION_ACK)) {
                            console.log('Connection acknowledged:', payloadText);
                        } else if (compareAction(action, ActionType.ENGINE_READY)) {
                            console.log('Engine ready:', payloadText);
                        } else if (compareAction(action, ActionType.STREAM_STARTED)) {
                            console.log('Stream started:', payloadText);
                        } else if (compareAction(action, ActionType.PARTIAL_TRANSCRIPT)) {
                            setStreamingTranscript(payloadText || "");
                        } else if (compareAction(action, ActionType.FINAL_TRANSCRIPT)) {
                            const finalText = payloadText || "";
                            if (finalText.trim()) {
                                // 先显示最终识别结果
                                setStreamingTranscript(finalText);
                                // 延迟一下再添加到聊天记录并清空，然后调用AI
                                setTimeout(() => {
                                    // 先添加用户消息到聊天记录
                                    addChatRecord({ role: ChatRole.HUMAN, content: finalText });
                                    setStreamingTranscript("");
                                    
                                    // 调用AI，禁用流式TTS，只在最后进行完整TTS
                                    chatWithAI(finalText, {
                                        addUserMessage: false, // 已经手动添加了用户消息
                                        enableStreamingTTS: false, // 禁用流式TTS
                                        enableFinalTTS: true // 启用最终TTS
                                    });
                                }, 500);
                            } else {
                                setStreamingTranscript("");
                            }
                        } else if (compareAction(action, ActionType.STREAM_ENDED)) {
                            setIsStreamingASR(false);
                            console.log('Stream ended:', payloadText);
                        } else if (compareAction(action, ActionType.ERROR)) {
                            console.error("Streaming ASR error:", payloadText);
                            reject(new Error(payloadText));
                        } else if (compareAction(action, ActionType.PONG)) {
                            console.log('Received PONG:', payloadText);
                        } else {
                            console.warn('Unknown action type:', action);
                        }
                    } else {
                        console.warn('Received non-binary message:', event.data);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error, 'Raw data:', event.data);
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                clearTimeout(timeout);
                reject(error);
            };

            wsRef.current.onclose = (event) => {
                clearTimeout(timeout);
                setIsStreamingASR(false);
                wsRef.current = null;
            };
        });
    };

    const fileClick = () => {
        // 文件上传功能待实现
    }

    const sendClick = () => {
        if (inputRef.current.value === "") return;
        setIsProcessing(true);
        chatWithAI(inputRef.current.value);
        inputRef.current.value = "";
    }

    const enterPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            sendClick();
        }
    }

    // 定义一个防抖函数，用于处理 Ctrl + M 的按键组合  
    const handleCtrlM = debounce(() => {
        micClick();
    }, 500);   

    useEffect(() => {
        // 聊天滚动条到底部
        chatbotRef.current.scrollTop = chatbotRef.current.scrollHeight + 100;
        // 添加事件监听器  
        const handleKeyDown = (event: KeyboardEvent) => {
            // 检查是否按下了 Ctrl + M
            if (event.ctrlKey && event.key === 'm') {
                handleCtrlM();
            }
        };

        // 绑定事件监听器到 document 或其他适当的 DOM 元素  
        document.addEventListener('keydown', handleKeyDown);
        // 清理函数，用于移除事件监听器  
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    })

    return (
        <div className="p-2 sm:p-6 justify-between flex flex-col h-full">
            {micRecordAlert ? <ConfirmAlert message={AUDIO_SUPPORT_ALERT} /> : null}
            <div id="messages" ref={chatbotRef} className="flex flex-col space-y-4 p-3 overflow-y-auto no-scrollbar z-10">
                {
                    showChatHistory ?
                        chatRecord.map((chat: ChatMessage, index: number) => (
                            <div className="chat-message" key={index}>
                                <div className={clsx(
                                    "flex items-end",
                                    chat.role == ChatRole.AI ? "" : "justify-end"
                                )}>
                                    <div className={clsx(
                                        "flex flex-col space-y-2 text-xs max-w-xs mx-2",
                                        chat.role == ChatRole.AI ? "order-2 items-start" : "order-1 items-end"
                                    )}>
                                        <div><Markdown className="px-4 py-2 rounded-lg inline-block rounded-bl-none bg-gray-300 text-gray-600">{chat.content}</Markdown></div>
                                    </div>
                                    <img src={chat.role == ChatRole.HUMAN ? "/icons/human_icon.svg" : "/icons/ai_icon.svg"} className="w-6 h-6 rounded-full order-1 self-start" />
                                </div>
                            </div>
                        ))
                        :
                        <></>
                }
                {/* 显示实时ASR识别结果 */}
                {isStreamingASR && streamingTranscript && (
                    <div className="chat-message">
                        <div className="flex items-end justify-end">
                            <div className="flex flex-col space-y-2 text-xs max-w-xs mx-2 order-1 items-end">
                                <div className="px-4 py-2 rounded-lg inline-block rounded-br-none bg-blue-100 text-blue-600 border-2 border-blue-200 border-dashed">
                                    <span className="opacity-75">正在识别: </span>
                                    <span>{streamingTranscript}</span>
                                    <span className="animate-pulse">|</span>
                                </div>
                            </div>
                            <img src="/icons/human_icon.svg" className="w-6 h-6 rounded-full order-1 self-start" />
                        </div>
                    </div>
                )}
            </div>

            <div className="px-4 pt-4 mb-2 sm:mb-0 z-10 w-full">

                
                {/* 流式ASR实时转录显示 */}
                {useStreamingASR && streamingTranscript && (
                    <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-sm text-blue-600 font-medium mb-1">实时转录:</div>
                        <div className="text-sm text-gray-700">{streamingTranscript}</div>
                    </div>
                )}
                
                <div className="relative flex">
                    <div className="absolute inset-y-0 flex items-center space-x-2">
                        <button type="button" onClick={micClick} disabled={isProcessing} className={clsx(
                            "inline-flex items-center justify-center rounded-full h-12 w-12 transition duration-500 ease-in-out hover:bg-gray-300 focus:outline-none",
                            micRecording ? "text-red-600" : "text-green-600",
                        )}>
                            {
                                micRecording ?
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.564A.562.562 0 0 1 9 14.437V9.564Z" />
                                    </svg>
                                    :
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                                    </svg>
                            }
                        </button>
                    </div>
                    <input enterKeyHint="send" type="text" disabled={isProcessing} placeholder="Write your message!" ref={inputRef} onKeyDown={enterPress} className="w-full focus:outline-none focus:placeholder-gray-400 text-gray-600 placeholder-gray-600 pl-12 bg-gray-200 rounded-md py-3" />
                    <div className="absolute right-0 items-center inset-y-0 hidden sm:flex">
                        <button type="button" className="inline-flex items-center justify-center rounded-full h-10 w-10 transition duration-500 ease-in-out text-gray-500 hover:bg-gray-300 focus:outline-none">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6 text-gray-600">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                            </svg>
                        </button>
                        <button type="button" onClick={sendClick} disabled={isProcessing} className="inline-flex items-center justify-center rounded-lg px-4 py-3 transition duration-500 ease-in-out text-white bg-blue-500 hover:bg-blue-400 focus:outline-none">
                            <span className="font-bold">Send</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6 ml-2 transform rotate-90">
                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}