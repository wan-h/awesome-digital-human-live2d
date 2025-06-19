'use client'

import { useEffect, memo } from "react";
import { CHAT_MODE, APP_TYPE, IFER_TYPE } from "@/lib/protocol";
import { ChatRecord } from "./record";
import { ChatInput, ChatVadInput, ChatStreamInput } from "./input";
import { 
    useSentioChatModeStore, 
    useSentioThemeStore,
    useSentioAsrStore
} from "@/lib/store/sentio";

function FreedomChatBot() {
    const { chatMode } = useSentioChatModeStore();
    const { infer_type } = useSentioAsrStore();
    console.log('infer_type', infer_type)
    return (
        <div className="flex flex-col full-height-minus-64px pb-6 md:px-6 gap-6 justify-between items-center z-10">
            <ChatRecord />
            {chatMode == CHAT_MODE.IMMSERSIVE ? (infer_type == IFER_TYPE.NORMAL ? <ChatVadInput/> : <ChatStreamInput />) : <ChatInput />}
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