import { create } from "zustand";
import { persist, createJSONStorage } from 'zustand/middleware'
import { ModelDefault } from "@/app/lib/live2d/lappdefine";
import { Comm } from "@/app/lib/comm";

// ==================== 交互模式 ==================
export enum InteractionMode {
    CHATBOT = "聊天模式",
    DIGITALHUMAN = "数字人模式",
    IMMERSIVE = "沉浸模式",

}

interface InteractionModeState {
    mode: InteractionMode
    setChatbotMode: () => void
    setDigitalhuamnMode: () => void
    setImmersiveMode: () => void
}

export const useInteractionModeStore = create<InteractionModeState>()(
    (set) => ({
        mode: InteractionMode.DIGITALHUMAN,
        setChatbotMode: () => set((state) => ({ mode: InteractionMode.CHATBOT })),
        setDigitalhuamnMode: () => set((state) => ({ mode: InteractionMode.DIGITALHUMAN })),
        setImmersiveMode: () => set((state) => ({ mode: InteractionMode.IMMERSIVE })),
    })

)

// ==================== 人物选择 ==================
interface CharacterState {
    character: string
    setCharacter: (character: string) => void
}
export const useCharacterStore = create<CharacterState>()(
    persist(
        (set) => ({
            character: ModelDefault,
            setCharacter: (by: string) => set((state) => ({ character: by })),
        }),
        {
            name: 'character-storage',
        }
    )

)

// ==================== 背景选择 ==================
interface BackgroundState {
    background: string | null
    setBackground: (background: string | null) => void
}
export const useBackgroundStore = create<BackgroundState>()(
    persist(
        (set) => ({
            background: null,
            setBackground: (by: string | null) => set((state) => ({ background: by })),
        }),
        {
            name: 'background-storage',
        }
    )
)

// ==================== 聊天记录 ==================
export enum ChatRole {
    HUMAN = "HUMAN",
    AI = "AI",
}
export interface ChatMessage {
    role: ChatRole
    content: string
}
interface ChatRecordState {
    chatRecord: ChatMessage[]
    addChatRecord: (message: ChatMessage) => void
    updateLastRecord: (message: ChatMessage) => void
}
export const useChatRecordStore = create<ChatRecordState>()(
    (set) => ({
        chatRecord: [],
        addChatRecord: (message: ChatMessage) => set((state) => ({ chatRecord: [...state.chatRecord, message] })),
        updateLastRecord: (message: ChatMessage) => set((state) => ({ chatRecord: [...state.chatRecord.slice(0, -1), message] })),
    })
)

// ==================== agent引擎 ==================
interface AgentEngineState {
    agentEngine: string
    fetchDefaultAgent: () => Promise<void>;
    setAgentEngine: (engine: string) => void
}
export const useAgentModeStore = create<AgentEngineState>()(
    persist(
        (set) => ({
            agentEngine: "RepeaterAgent",
            // 获取默认的agent引擎
            fetchDefaultAgent: async () => {
                Comm.getInstance().getDefaultAgent().then((res) => {
                    if (res) {
                        set({ agentEngine: res })
                    }
                })
            },
            setAgentEngine: (engine: string) => set((state) => ({ agentEngine: engine })),
        }),
        {
            name: 'agentEngine-storage',
        }
    )
)

// ==================== agent设置 ==================

interface AgentEngineSettings {
    agentSettings: { [key: string]: { [key: string]: string }[] }
    fetchAgentSettings: () => Promise<void>;
    setAgentSettings: (engine: string, settings: { [key: string]: string }[]) => void
}

export const useAgentEngineSettingsStore = create<AgentEngineSettings>()(
    persist(
        (set) => ({
            agentSettings: {},
            fetchAgentSettings: async () => {
                Comm.getInstance().getAgentsList().then((agents) => {
                    agents.forEach((agent) => {
                        Comm.getInstance().getAgentSettings(agent).then((res) => {
                            if (res) {
                                console.log(res)
                                set((state) => ({agentSettings: {...state.agentSettings, [agent]: res}}))
                            }
                        })
                    })
                })
            },
            setAgentSettings: (engine: string, newSettings: { [key: string]: string }[]) => set(
                (state) => ({agentSettings: {...state.agentSettings, [engine]: newSettings}})
            )
        }),
        {
            name: 'agentEngineSettings-storage',
        }
    )
)

// ==================== 静音设置 ==================
interface MuteState {
    mute: boolean
    setMute: (mute: boolean) => void
}
export const useMuteStore = create<MuteState>()(
    persist(
        (set) => ({
            mute: false,
            setMute: (mute: boolean) => set((state) => ({ mute: mute })),
        }),
        {
            name: 'mute-storage', // name of the item in the storage (must be unique)
        }
    )

)

// ==================== 心跳标志 ==================
interface HeartbeatState {
    heartbeat: boolean
    setHeartbeat: (heartbeat: boolean) => void
}
export const useHeartbeatStore = create<HeartbeatState>()(
    (set) => ({
        heartbeat: false,
        setHeartbeat: (heartbeat: boolean) => set((state) => ({ heartbeat: heartbeat })),
    })
)