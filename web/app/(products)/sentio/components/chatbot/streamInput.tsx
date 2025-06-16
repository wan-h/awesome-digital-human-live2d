'use client';

import { useState, useRef, useEffect, memo } from 'react';
import { StopCircleIcon, MicrophoneIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { useSentioAsrStore } from '@/lib/store/sentio';
import { Input, Button, Spinner, addToast, Tooltip } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { useChatWithAgent, useAudioTimer } from '../../hooks/chat';
import clsx from 'clsx';
import { ASRWebSocketClient, ASRWebSocketEvents } from '@/lib/utils/asrWebSocket';

/**
 * 流式ASR输入组件
 * 基于WebSocket实现实时语音识别
 */
export const ChatStreamInput = memo(({
    postProcess
}: {
    postProcess?: (conversation_id: string, message_id: string, think: string, content: string) => void
}) => {
    const t = useTranslations('Products.sentio');
    const [message, setMessage] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [partialText, setPartialText] = useState("");
    const { enable: enableASR } = useSentioAsrStore();
    const { chat, abort, chatting } = useChatWithAgent();
    const { startAudioTimer, stopAudioTimer } = useAudioTimer();
    
    const asrClientRef = useRef<ASRWebSocketClient | null>(null);
    const isStreamingRef = useRef(false);

    // ASR WebSocket事件处理
    const asrEvents: ASRWebSocketEvents = {
        onConnectionAck: (message) => {
            console.log('ASR连接确认:', message);
        },
        onEngineReady: (message) => {
            console.log('ASR引擎就绪:', message);
        },
        onStreamStarted: (message) => {
            console.log('ASR流已开始:', message);
        },
        onPartialTranscript: (text) => {
            console.log('部分识别结果:', text);
            setPartialText(text);
        },
        onFinalTranscript: (text) => {
            console.log('最终识别结果:', text);
            if (text.trim()) {
                setMessage(text.trim());
                setPartialText("");
            }
        },
        onStreamEnded: (message) => {
            console.log('ASR流已结束:', message);
        },
        onError: (error) => {
            console.error('ASR错误:', error);
            addToast({
                title: `ASR错误: ${error}`,
                variant: "flat",
                color: "danger"
            });
            handleStopRecord();
        }
    };

    // 初始化ASR客户端并建立持久连接
    useEffect(() => {
        let mounted = true;
        
        const initializeASRClient = async () => {
            if (enableASR && !asrClientRef.current) {
                const client = new ASRWebSocketClient(
                    "ws://localhost:8880/adh/stream_asr/v0/engine",
                    asrEvents
                );
                
                try {
                    setIsConnecting(true);
                    const connected = await client.connect();
                    if (connected && mounted) {
                        asrClientRef.current = client;
                        console.log('ASR客户端已连接并准备就绪');
                    } else if (!mounted) {
                        // 组件已卸载，清理连接
                        await client.disconnect();
                    }
                } catch (error) {
                    console.error('初始化ASR客户端失败:', error);
                    if (mounted) {
                        addToast({
                            title: `ASR连接失败: ${error}`,
                            variant: "flat",
                            color: "danger"
                        });
                    }
                } finally {
                    if (mounted) {
                        setIsConnecting(false);
                    }
                }
            }
        };
        
        initializeASRClient();
        
        return () => {
            mounted = false;
            if (asrClientRef.current) {
                asrClientRef.current.disconnect();
                asrClientRef.current = null;
            }
        };
    }, [enableASR]);

    const handleStartRecord = async () => {
        if (!enableASR) {
            addToast({
                title: t('asrNotEnabled'),
                variant: "flat",
                color: "warning"
            });
            return;
        }
        
        if (!asrClientRef.current) {
            addToast({
                title: 'ASR客户端未就绪，请稍后再试',
                variant: "flat",
                color: "warning"
            });
            return;
        }

        abort();
        setPartialText("");
        setMessage("");
        
        try {
            // 检查连接状态，如果断开则重连
            if (!asrClientRef.current.isConnected()) {
                setIsConnecting(true);
                const reconnected = await asrClientRef.current.connect();
                if (!reconnected) {
                    throw new Error('无法重新连接到ASR服务器');
                }
                setIsConnecting(false);
            }

            // 开始音频流
            const streamStarted = await asrClientRef.current.startAudioStream();
            if (!streamStarted) {
                throw new Error('无法启动音频流');
            }

            startAudioTimer();
            setIsRecording(true);
            isStreamingRef.current = true;
            console.log('开始流式录音和识别...');
        } catch (error) {
            console.error('启动录音失败:', error);
            addToast({
                title: `启动录音失败: ${error}`,
                variant: "flat",
                color: "danger"
            });
            setIsConnecting(false);
        }
    };

    const handleStopRecord = async () => {
        if (!asrClientRef.current || !isStreamingRef.current) {
            return;
        }

        setIsRecording(false);
        isStreamingRef.current = false;
        
        if (!stopAudioTimer()) {
            // 录音时间不符合要求，清理状态
            setPartialText("");
            setMessage("");
            await asrClientRef.current.stopAudioStream();
            return;
        }

        try {
            // 停止音频流，但保持WebSocket连接
            await asrClientRef.current.stopAudioStream();
            
            // 等待最终识别结果
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.log('流式录音和识别已停止，连接保持活跃');
        } catch (error) {
            console.error('停止录音失败:', error);
        }
    };

    const onSendClick = () => {
        if (message.trim() === "") return;
        chat(message, postProcess);
        setMessage("");
        setPartialText("");
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            onSendClick();
        }
    };

    // 快捷键支持
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "m" && e.ctrlKey) {
                e.preventDefault();
                if (isRecording) {
                    handleStopRecord();
                } else {
                    handleStartRecord();
                }
            }
        };
        
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isRecording]);

    // 显示的文本：优先显示部分识别结果，否则显示完整消息
    const displayText = partialText || message;

    return (
        <div className='flex flex-col w-4/5 md:w-2/3 2xl:w-1/2 items-start z-10 gap-2'>
            {/* 部分识别结果提示 */}
            {partialText && (
                <div className='w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg'>
                    <p className='text-sm text-blue-600'>正在识别: {partialText}</p>
                </div>
            )}
            
            <div className='flex w-full items-center z-10'>
                <Input
                    className='opacity-90'
                    startContent={
                        <button
                            type="button"
                            disabled={!enableASR || isConnecting}
                            aria-label="toggle recording"
                            className={clsx(
                                "focus:outline-none",
                                isRecording ? "text-red-500" : 
                                enableASR ? "hover:text-green-500" : "hover:text-gray-500"
                            )}
                        >
                            {isConnecting ? (
                                <Spinner size="sm" />
                            ) : isRecording ? (
                                <StopCircleIcon className='size-6' onClick={handleStopRecord} />
                            ) : (
                                <Tooltip className='opacity-90' content="Ctrl + M (流式识别)">
                                    <MicrophoneIcon className='size-6' onClick={handleStartRecord} />
                                </Tooltip>
                            )}
                        </button>
                    }
                    endContent={
                        chatting ? (
                            <button
                                type="button"
                                onClick={abort}
                                className="focus:outline-none hover:text-red-500"
                            >
                                <StopCircleIcon className='size-6' />
                            </button>
                        ) : null
                    }
                    type='text'
                    enterKeyHint='send'
                    value={displayText}
                    onValueChange={setMessage}
                    onKeyDown={onKeyDown}
                    disabled={isRecording || isConnecting}
                    placeholder={isRecording ? "正在录音和识别..." : 
                               isConnecting ? "正在连接ASR服务..." : 
                               "输入消息或按住麦克风说话"}
                />
                <Button 
                    className='opacity-90' 
                    isIconOnly 
                    color="primary" 
                    onPress={onSendClick}
                    disabled={!displayText.trim() || isRecording || isConnecting}
                >
                    <PaperAirplaneIcon className='size-6' />
                </Button>
            </div>
            
            {/* 录音状态指示 */}
            {isRecording && (
                <div className='w-full flex items-center justify-center gap-2 py-2'>
                    <div className='w-3 h-3 bg-red-500 rounded-full animate-pulse'></div>
                    <span className='text-sm text-gray-600'>正在录音和实时识别...</span>
                </div>
            )}
        </div>
    );
});

ChatStreamInput.displayName = 'ChatStreamInput';