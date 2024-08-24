'use client';
// import Image from "next/image";
import clsx from "clsx";
import { debounce } from 'lodash';
import { useEffect, useRef, useState } from "react";
import { useChatRecordStore, ChatRole, ChatMessage, useAgentEngineSettingsStore, useAgentModeStore, useMuteStore, useInteractionModeStore, InteractionMode } from "@/app/lib/store";
import { ConfirmAlert } from "@/app/ui/common/alert";
import { AUDIO_SUPPORT_ALERT, AI_THINK_MESSAGE } from "@/app/lib/constants";
import { Comm } from "@/app/lib/comm";
import { CharacterManager } from "@/app/lib/character";
import Recorder from 'js-audio-recorder';

let micRecorder: Recorder | null = null;
let isRecording: boolean = false;


export default function Chatbot(props: { showChatHistory: boolean }) {
    const { showChatHistory } = props;
    const { chatRecord, addChatRecord, updateLastRecord } = useChatRecordStore();
    const { mute } = useMuteStore();
    const { agentEngine } = useAgentModeStore();
    const { mode } = useInteractionModeStore();
    const { agentSettings } = useAgentEngineSettingsStore();
    const [settings, setSettings] = useState<{[key: string]: string}>({});
    const [micRecording, setMicRecording] = useState(false);
    const [micRecordAlert, setmicRecordAlert] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const chatbotRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (agentEngine in agentSettings) {
            let newSettings: {[key: string]: string} = {}
            for (let setting of agentSettings[agentEngine]){
                newSettings[setting.NAME] = setting.DEFAULT;
            }
            setSettings(newSettings);
        }
    }, [agentEngine, agentSettings]);

    const chatWithAI = (message: string) => {
        addChatRecord({ role: ChatRole.HUMAN, content: message });
        // 请求AI
        let responseText = "";
        let audioText = "";
        // 保证顺序执行
        let audioRecorderIndex = 0;
        let audioRecorderDict = new Map<number, ArrayBuffer>();
        addChatRecord({ role: ChatRole.AI, content: AI_THINK_MESSAGE });
        
        Comm.getInstance().streamingChat(message, agentEngine, settings, (index: number, data: string) => {
            responseText += data;
            updateLastRecord({ role: ChatRole.AI, content: responseText });
            if (!mute && mode != InteractionMode.CHATBOT) {
                // 按照标点符号断句处理
                audioText += data;
                // 断句判断符号
                let punc = ["。", ".", "！", "!", "？", "?", "；", ";", "，", ","];
                // 找到最后一个包含这些符号的位置
                let lastPuncIndex = -1;
                for (let i = 0; i < punc.length; i++) {
                    let index = audioText.lastIndexOf(punc[i]);
                    if (index > lastPuncIndex) {
                        lastPuncIndex = index;
                        break;
                    }
                }
                if (lastPuncIndex !== -1) {
                    let firstPart = audioText.slice(0, lastPuncIndex + 1);
                    let secondPart = audioText.slice(lastPuncIndex + 1);
                    console.log("tts:", firstPart);
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
            // 处理剩余tts
            if (!mute && audioText) {
                console.log("tts:", audioText);
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
            }
            setIsProcessing(false);
        });
    }


    const micClick = () => {
        if (isProcessing) return;
        if (micRecorder == null) {
            micRecorder = new Recorder({
                sampleBits: 16,         // 采样位数，支持 8 或 16，默认是16
                sampleRate: 16000,      // 采样率，支持 11025、16000、22050、24000、44100、48000，根据浏览器默认值，我的chrome是48000
                numChannels: 1,         // 声道，支持 1 或 2， 默认是1
            });
        }
        if (!isRecording) {
            micRecorder.start().then(
                () => {
                    isRecording = true;
                    setMicRecording(true);
                },
                (error) => {
                    console.error(error);
                    setmicRecordAlert(true);
                }
            );
        } else {
            micRecorder.stop();
            isRecording = false;
            setMicRecording(false);
            setIsProcessing(true);
            Comm.getInstance().asr(micRecorder.getWAVBlob(), settings).then(
                (res) => {
                    console.log("asr: ", res);
                    if (res) {
                        chatWithAI(res);
                    } else {
                        setIsProcessing(false);
                    }
                }
            ).catch(
                (error) => {
                    setIsProcessing(false);
                }
            )
        }
    }

    const fileClick = () => {
        console.log("file clicked");
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
        console.log('Ctrl + M was pressed!');
        micClick();
    }, 500); // 1000 毫秒内多次触发只执行一次   

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
                                    chat.role == ChatRole.HUMAN ? "" : "justify-end"
                                )}>
                                    <div className={clsx(
                                        "flex flex-col space-y-2 text-xs max-w-xs mx-2",
                                        chat.role == ChatRole.HUMAN ? "order-2 items-start" : "order-1 items-end"
                                    )}>
                                        <div><span className="px-4 py-2 rounded-lg inline-block rounded-bl-none bg-gray-300 text-gray-600">{chat.content}</span></div>
                                    </div>
                                    <img src={chat.role == ChatRole.HUMAN ? "/icons/human_icon.svg" : "/icons/ai_icon.svg"} className="w-6 h-6 rounded-full order-1" />
                                </div>
                            </div>
                        ))
                        :
                        <></>
                }
            </div>

            <div className="px-4 pt-4 mb-2 sm:mb-0 z-10 w-full">
                <div className="relative flex">
                    <div className="absolute inset-y-0 flex items-center">
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