import { create } from "zustand";
import { persist, createJSONStorage } from 'zustand/middleware'
import { ResourceModel, ChatMessage, CHAT_MODE, APP_TYPE } from '@/lib/protocol';
import * as CONSTANTS from '@/lib/constants';

// ==================== 聊天记录 ==================
interface SentioChatRecordState {
    chatRecord: ChatMessage[],
    addChatRecord: (message: ChatMessage) => void,
    updateLastRecord: (message: ChatMessage) => void,
    clearChatRecord: () => void
}
export const useChatRecordStore = create<SentioChatRecordState>()(
    persist(
        (set) => ({
            chatRecord: [],
            addChatRecord: (message: ChatMessage) => set((state) => ({ chatRecord: [...state.chatRecord, message] })),
            updateLastRecord: (message: ChatMessage) => set((state) => ({ chatRecord: [...state.chatRecord.slice(0, -1), message] })),
            clearChatRecord: () => set((state) => ({ chatRecord: [] })),
        }),
        {
            name: 'sentio-chat-record-storage'
        }
    )
)

// ==================== 基础设置 ==================
interface SentioBasicState {
    sound: boolean,
    lipFactor: number,
    showThink: boolean
    setSound: (sound: boolean) => void
    setShowThink: (showThink: boolean) => void
    setLipFactor: (weight: number) => void
}

export const useSentioBasicStore = create<SentioBasicState>()(
    persist(
        (set) => ({
            sound: true,
            showThink: true,
            lipFactor: CONSTANTS.SENTIO_LIPFACTOR_DEFAULT,
            setSound: (sound: boolean) => set((state) => ({ sound: sound })),
            setShowThink: (showThink: boolean) => set((state) => ({ showThink: showThink })),
            setLipFactor: (weight: number) => set((state) => ({ lipFactor: weight }))
        }),
        {
            name: 'sentio-basic-storage'
        }
    )
)

// ==================== ASR 相关设置 ==================
interface SentioAsrState {
    enable: boolean,
    engine: string,
    settings: { [key: string]: any },
    setEnable: (enable: boolean) => void,
    setEngine: (engine: string) => void,
    setSettings: (settings: { [key: string]: any }) => void
}

export const useSentioAsrStore = create<SentioAsrState>()(
    persist(
        (set) => ({
            enable: true,
            engine: "default",
            settings: {},
            setEnable: (enable: boolean) => set((state) => ({ enable: enable })),
            setEngine: (by: string) => set((state) => ({ engine: by })),
            setSettings: (by: { [key: string]: any }) => set((state) => ({ settings: by }))
        }),
        {
            name: 'sentio-asr-storage',
        }
    )
)

// ==================== TTS 相关设置 ==================
interface SentioTtsState {
    enable: boolean,
    engine: string,
    settings: { [key: string]: any },
    setEnable: (enable: boolean) => void,
    setEngine: (engine: string) => void,
    setSettings: (settings: { [key: string]: any }) => void
}

export const useSentioTtsStore = create<SentioTtsState>()(
    persist(
        (set) => ({
            enable: true,
            engine: "default",
            settings: {},
            setEnable: (enable: boolean) => set((state) => ({ enable: enable })),
            setEngine: (by: string) => set((state) => ({ engine: by })),
            setSettings: (by: { [key: string]: any }) => set((state) => ({ settings: by }))
        }),
        {
            name: 'sentio-tts-storage',
        }
    )
)

// ==================== Agent 相关设置 ==================
interface SentioAgentState {
    enable: boolean,
    engine: string,
    settings: { [key: string]: any },
    setEnable: (enable: boolean) => void,
    setEngine: (engine: string) => void,
    setSettings: (settings: { [key: string]: any }) => void
}

export const useSentioAgentStore = create<SentioAgentState>()(
    persist(
        (set) => ({
            enable: true,
            engine: "default",
            settings: {},
            // setEnable: (enable: boolean) => set((state) => ({ enable: enable })),
            setEnable: (enable: boolean) => set((state) => ({})),
            setEngine: (by: string) => set((state) => ({ engine: by })),
            setSettings: (by: { [key: string]: any }) => set((state) => ({ settings: by }))
        }),
        {
            name: 'sentio-agent-storage',
        }
    )
)

// ==================== 背景选择 ==================
interface SentioBackgroundState {
    background: ResourceModel | null,
    setBackground: (background: ResourceModel | null) => void
}
export const useSentioBackgroundStore = create<SentioBackgroundState>()(
    persist(
        (set) => ({
            background: null,
            setBackground: (by: ResourceModel | null) => set((state) => ({ background: by })),
        }),
        {
            name: 'sentio-background-storage',
        }
    )
)

// ==================== 人物选择 ==================
interface SentioCharacterState {
    character: ResourceModel | null,
    setCharacter: (character: ResourceModel | null) => void
}
export const useSentioCharacterStore = create<SentioCharacterState>()(
    persist(
        (set) => ({
            character: null,
            setCharacter: (by: ResourceModel | null) => set((state) => ({ character: by })),
        }),
        {
            name: 'sentio-character-storage',
        }
    )
)

// ==================== 聊天模式 ==================
interface SentioChatModeState {
    chatMode: CHAT_MODE,
    setChatMode: (chatMode: CHAT_MODE) => void
}
export const useSentioChatModeStore = create<SentioChatModeState>()(
    persist(
        (set) => ({
            chatMode: CONSTANTS.SENTIO_CHATMODE_DEFULT,
            setChatMode: (by: CHAT_MODE) => set((state) => ({ chatMode: by })),
        }),
        {
            name: 'sentio-chat-mode-storage',
        }
    )
)

// ==================== 主题 ==================
interface SentioThemeState {
    theme: APP_TYPE,
    setTheme: (theme: APP_TYPE) => void
}
export const useSentioThemeStore = create<SentioThemeState>()(
    persist(
        (set) => ({
            theme: CONSTANTS.SENTIO_THENE_DEFAULT,
            // setTheme: (by: APP_TYPE) => set((state) => ({ theme: by })),
            setTheme: (by: APP_TYPE) => set((state) => ({ theme: by })),
        }),
        {
            name: 'sentio-theme-storage',
        }
    )
)


// ==================== live2d ==================
interface SentioLive2DState {
    ready: boolean,
    setReady: (enable: boolean) => void
}

export const useSentioLive2DStore = create<SentioLive2DState>()(
    (set) => ({
        ready: false,
        setReady: (ready: boolean) => set((state) => ({ ready: ready })),
    })
)