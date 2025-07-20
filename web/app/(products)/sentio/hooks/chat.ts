import { useEffect, useRef, useState } from "react";
import { 
    useChatRecordStore, 
    useSentioAgentStore, 
    useSentioTtsStore,
    useSentioBasicStore,
} from "@/lib/store/sentio";
import { useTranslations } from 'next-intl';
import { CHAT_ROLE, EventResponse, STREAMING_EVENT_TYPE, IFER_TYPE } from "@/lib/protocol";
import { Live2dManager } from '@/lib/live2d/live2dManager';
import { SENTIO_TTS_PUNC } from '@/lib/constants';
import { base64ToArrayBuffer, ttsTextPreprocess } from '@/lib/func';
import { convertMp3ArrayBufferToWavArrayBuffer } from "@/lib/utils/audio";
import {
    api_tts_infer,
    api_agent_stream,
} from '@/lib/api/server';
import { addToast } from "@heroui/react";
import { SENTIO_RECODER_MIN_TIME, SENTIO_RECODER_MAX_TIME, SENTIO_TTS_SENTENCE_LENGTH_MIN } from "@/lib/constants";
import { createStreamingTTSClient, StreamingTTSWebsocketClient } from "@/lib/api/streamingTtsWebsocket";

export function useAudioTimer() {
    const t = useTranslations('Products.sentio');
    // 时间记录
    const startTime = useRef(new Date());
    const toast = (message: string) => {
        addToast({
            title: message,
            color: "warning",
        });
    }
    const startAudioTimer = () => {
        startTime.current = new Date();
    }
    const stopAudioTimer = (): boolean => {
        const duration = new Date().getTime() - startTime.current.getTime();
        if (duration < SENTIO_RECODER_MIN_TIME) {
            toast(`${t('recordingTime')} < ${SENTIO_RECODER_MIN_TIME}`);
        } else if (duration > SENTIO_RECODER_MAX_TIME) {
            toast(`${t('recordingTime')} > ${SENTIO_RECODER_MAX_TIME}`);
        } else {
            return true;
        }
        return false;
    }

    return { startAudioTimer, stopAudioTimer }
}

// 根据断句符号找到第一个断句
const findPuncIndex = (content: string, beginIndex: number) => {
    let latestIndex = -1;
    // 找最近的断句标点符号
    for (let i = 0; i < SENTIO_TTS_PUNC.length; i++) {
        const index = content.indexOf(SENTIO_TTS_PUNC[i], beginIndex);
        if (index > beginIndex) {
            if (latestIndex < 0 || index < latestIndex) {
                latestIndex = index;
            }
        }
    }
    return latestIndex;
}

export function useChatWithAgent() {
    const [ chatting, setChatting ] = useState(false);
    const { engine: agentEngine, settings: agentSettings } = useSentioAgentStore();
    const { engine: ttsEngine, settings: ttsSettings, infer_type: ttsInferType } = useSentioTtsStore();
    const { sound } = useSentioBasicStore();

    const { addChatRecord, updateLastRecord } = useChatRecordStore();
    const controller = useRef<AbortController | null>(null);
    const conversationId = useRef<string>("");
    const messageId = useRef<string>("");
    const streamingTtsClient = useRef<StreamingTTSWebsocketClient | null>(null);

    const abort = () => {
        setChatting(false);
        // 停止音频播放
        Live2dManager.getInstance().stopAudio();
        // 断开流式TTS连接
        if (streamingTtsClient.current) {
            streamingTtsClient.current.disconnect();
            streamingTtsClient.current = null;
        }
        if (controller.current) {
            controller.current.abort("abort");
            controller.current = null;
        }
    }

    const chatWithAgent = (
        message: string, 
        postProcess?: (conversation_id: string, message_id: string, think: string, content: string) => void
    ) => {
        addChatRecord({ role: CHAT_ROLE.HUMAN, think: "", content: message });
        addChatRecord({ role: CHAT_ROLE.AI, think: "", content: "..." });
        controller.current = new AbortController();
        setChatting(true);
        let agentResponse = "";
        let agentThink = "";
        let ttsProcessIndex = 0;
        let agentDone = true;

        const doTTS = () => {
            if (!!!controller.current) return;
            
            // 根据infer_type选择TTS模式
            if (ttsInferType === IFER_TYPE.STREAM) {
                doStreamingTTS();
            } else {
                doTraditionalTTS();
            }
        }

        // 流式TTS处理
        const doStreamingTTS = async () => {
            // 初始化流式TTS客户端（如果尚未初始化）
            if (!streamingTtsClient.current) {
                try {
                    streamingTtsClient.current = createStreamingTTSClient(
                        ttsEngine,
                        ttsSettings,
                        {
                            onConnected: () => {
                                console.log('流式TTS连接成功');
                            },
                            onEngineReady: () => {
                                console.log('流式TTS引擎就绪');
                            },
                            onAudioChunk: (audioData: Uint8Array) => {
                                // 直接播放音频块，不需要转换
                                Live2dManager.getInstance().playAudioChunk(audioData);
                            },
                            onStreamEnded: () => {
                                console.log('流式TTS流结束');
                            },
                            onError: (error: string) => {
                                console.error('流式TTS错误:', error);
                            },
                            onDisconnected: () => {
                                console.log('流式TTS连接断开');
                                streamingTtsClient.current = null;
                            }
                        }
                    );
                    await streamingTtsClient.current.connect();
                } catch (error) {
                    console.error('流式TTS连接失败:', error);
                    // 回退到传统TTS
                    doTraditionalTTS();
                    return;
                }
            }

            // agent持续输出中 | agentResponse未处理完毕
            if (!agentDone || agentResponse.length > ttsProcessIndex) {
                let ttsText = "";
                
                let beginIndex = ttsProcessIndex;
                while (beginIndex >= ttsProcessIndex) {
                    const puncIndex = findPuncIndex(agentResponse, beginIndex);
                    // 找到断句
                    if (puncIndex > beginIndex) {
                        if (puncIndex - ttsProcessIndex > SENTIO_TTS_SENTENCE_LENGTH_MIN) {
                            ttsText = agentResponse.substring(ttsProcessIndex, puncIndex + 1);
                            ttsProcessIndex = puncIndex + 1;
                            break;
                        } else {
                            // 长度不符合, 继续往后找
                            beginIndex = puncIndex + 1;
                            continue;
                        }
                    }
                    // 未找到
                    beginIndex = -1;
                }
                if (ttsText.length == 0 && agentDone) {
                    // agent输出完毕，但未找到断句符号，则将剩余内容全部进行TTS
                    ttsText = agentResponse.substring(ttsProcessIndex);
                    ttsProcessIndex = agentResponse.length;
                }
                
                if (ttsText != "") {
                    // 处理断句tts
                    const processText = ttsTextPreprocess(ttsText);
                    if (!!processText && streamingTtsClient.current?.isReady()) {
                        try {
                            await streamingTtsClient.current.synthesizeText(processText);
                        } catch (error) {
                            console.error('流式TTS合成错误:', error);
                        }
                    }
                    // 继续处理下一个断句
                    setTimeout(() => {
                        doTTS();
                    }, 10);
                } else {
                    // 10ms 休眠定时器执行
                    setTimeout(() => {
                        doTTS();
                    }, 10);
                }
            } else {
                // 正常对话结束
                setChatting(false);
            }
        }

        // 传统TTS处理（保持原有逻辑）
        const doTraditionalTTS = () => {
            // agent持续输出中 | agentResponse未处理完毕
            if (!agentDone || agentResponse.length > ttsProcessIndex) {
                let ttsText = "";
                const ttsCallback = (ttsResult: string) => {
                    if (ttsResult != "") {
                        const audioData = base64ToArrayBuffer(ttsResult);
                        convertMp3ArrayBufferToWavArrayBuffer(audioData).then((buffer) => {
                            // 将音频数据放入队列
                            Live2dManager.getInstance().pushAudioQueue(buffer);
                            ttsText = "";  
                        })
                    }
                    // TTS处理完毕，继续处理下一个断句
                    doTTS();
                }

                let beginIndex = ttsProcessIndex;
                while (beginIndex >= ttsProcessIndex) {
                    const puncIndex = findPuncIndex(agentResponse, beginIndex);
                    // 找到断句
                    if (puncIndex > beginIndex) {
                        if (puncIndex - ttsProcessIndex > SENTIO_TTS_SENTENCE_LENGTH_MIN) {
                            ttsText = agentResponse.substring(ttsProcessIndex, puncIndex + 1);
                            ttsProcessIndex = puncIndex + 1;
                            break;
                        } else {
                            // 长度不符合, 继续往后找
                            beginIndex = puncIndex + 1;
                            continue;
                        }
                    }
                    // 未找到
                    beginIndex = -1;
                }
                if (ttsText.length == 0 && agentDone) {
                    // agent输出完毕，但未找到断句符号，则将剩余内容全部进行TTS
                    ttsText = agentResponse.substring(ttsProcessIndex);
                    ttsProcessIndex = agentResponse.length;
                }
                if (ttsText != "") {
                    // 处理断句tts
                    const processText = ttsTextPreprocess(ttsText);
                    if (!!processText) {
                        api_tts_infer(
                            ttsEngine, 
                            ttsSettings, 
                            processText, 
                            controller.current?.signal
                        ).then((ttsResult) => {ttsCallback(ttsResult)});
                    } else {
                        ttsCallback("");
                    }
                } else {
                    // 10ms 休眠定时器执行
                    setTimeout(() => {
                        doTTS();
                    }, 10);
                }
            } else {
                // 正常对话结束
                setChatting(false);
            }
        }
        const agentCallback = (response: EventResponse) => {
            const event = response.event;
            const data = response.data;
            switch (event) {
                case STREAMING_EVENT_TYPE.CONVERSATION_ID:
                    conversationId.current = data;
                    break;
                case STREAMING_EVENT_TYPE.MESSAGE_ID:
                    messageId.current = data;
                    break;
                case STREAMING_EVENT_TYPE.THINK:
                    agentThink += data;
                    updateLastRecord({ role: CHAT_ROLE.AI, think: agentThink, content: agentResponse });
                    break;
                case STREAMING_EVENT_TYPE.TEXT:
                    agentResponse += data;
                    updateLastRecord({ role: CHAT_ROLE.AI, think: agentThink, content: agentResponse });
                    if (agentDone) {
                        // 首次触发TTS
                        agentDone = false;
                        if (sound) {
                            doTTS();
                        }
                    }
                    break;
                case STREAMING_EVENT_TYPE.ERROR:
                    // 错误处理
                    addToast({
                        title: data,
                        color: "danger",
                    });
                case STREAMING_EVENT_TYPE.TASK:
                case STREAMING_EVENT_TYPE.DONE:
                    // agent输出结束, 后处理执行若存在
                    if (postProcess) {
                        postProcess(conversationId.current, messageId.current, agentThink, agentResponse);
                    }
                    if (agentDone) {
                        setChatting(false);
                    } else {
                        agentDone = true;
                    }
                    break;
                default:
                    break;
            }
        }
        const agentErrorCallback = (error: Error) => {
            agentDone = true;
            setChatting(false);
        }
        api_agent_stream(agentEngine, agentSettings, message, conversationId.current, controller.current.signal, agentCallback, agentErrorCallback);
    }

    const chat = (
        message: string,
        postProcess?: (conversation_id: string, message_id: string, think: string, content: string) => void
    ) => {
        // 新对话终止旧对话
        abort();
        chatWithAgent(message, postProcess);
    }

    useEffect(() => {
        // createConversation(()=>{}, true);
        conversationId.current = "";
        return () => {
            abort(); // 终止对话
        }
    }, [agentEngine, agentSettings, ttsEngine, ttsSettings, ttsInferType])

    return { chat, abort, chatting, conversationId };
}