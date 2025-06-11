'use client'

import { useEffect, memo } from "react";
import { CHAT_MODE, APP_TYPE } from "@/lib/protocol";
import { ChatRecord } from "./record";
import { ChatInput, ChatVadInput } from "./input";
import { ChatStreamInput } from "./streamInput";
import { 
    useSentioChatModeStore, 
    useSentioThemeStore,
    useSentioAsrStore
} from "@/lib/store/sentio";

function FreedomChatBot() {
    const { chatMode } = useSentioChatModeStore();
    const { streamMode } = useSentioAsrStore();
    
    // 根据聊天模式选择不同的输入组件
    const renderInputComponent = () => {
        switch (chatMode) {
            case CHAT_MODE.IMMSERSIVE:
                return <ChatVadInput />;
            case CHAT_MODE.DIALOGUE:
            default:
                // 根据用户设置选择使用流式ASR还是传统ASR
                return streamMode ? <ChatStreamInput /> : <ChatInput />;
        }
    };
    
    return (
        <div className="flex flex-col full-height-minus-64px pb-6 md:px-6 gap-6 justify-between items-center z-10">
            <ChatRecord />
            {renderInputComponent()}
        </div>
    )
}

function ChatBot() {
    const { theme } = useSentioThemeStore();
    switch (theme) {
        case APP_TYPE.FREEDOM:
            return <FreedomChatBot />
        default:
            return <FreedomChatBot />
    }
}

export default memo(ChatBot);