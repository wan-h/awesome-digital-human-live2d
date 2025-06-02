import { ENGINE_TYPE, AppConfig, ResourceModel, RESOURCE_TYPE, APP_TYPE } from "@/lib/protocol";
import {
    useSentioBasicStore,
    useSentioAsrStore,
    useSentioTtsStore,
    useSentioAgentStore,
    useSentioBackgroundStore,
    useSentioCharacterStore,
    useSentioChatModeStore,
    useSentioThemeStore,
    useChatRecordStore
} from "@/lib/store/sentio";
import { Live2dManager } from "@/lib/live2d/live2dManager";
import { getSrcPath } from "@/lib/path";
import { useLive2D } from "./live2d";
import * as CONSTANTS from '@/lib/constants';

export function useAppConfig() {
    const { enable: asrEnable, setEnable: setAsrEnable, engine: asrEngine, setEngine: setAsrEngine, settings: asrSettings, setSettings: setAsrSettings } = useSentioAsrStore();
    const { enable: ttsEnable, setEnable: setTtsEnable, engine: ttsEngine, setEngine: setTtsEngine, setSettings: setTtsSettings, settings: ttsSettings } = useSentioTtsStore();
    const { engine: agentEngine, setEngine: setAgentEngine, setSettings: setAgentSettings, settings: agentSettings } = useSentioAgentStore();
    const { background, setBackground } = useSentioBackgroundStore();
    const { character, setCharacter } = useSentioCharacterStore();
    const { sound, setSound, showThink, setShowThink, lipFactor, setLipFactor } = useSentioBasicStore();
    const { chatMode, setChatMode } = useSentioChatModeStore();
    const { theme, setTheme } = useSentioThemeStore();
    const { clearChatRecord } = useChatRecordStore();
    const { setLive2dCharacter } = useLive2D();

    const setCurrentCharacter = (character: ResourceModel | null) => {
        if (character == null) {
            const model = CONSTANTS.SENTIO_CHARACTER_DEFAULT;
            const path = CONSTANTS.SENTIO_CHARACTER_FREE_PATH;
            const defaultCharacter: ResourceModel = {
                resource_id: "FREE_HaruGreeter",
                name: model,
                link: getSrcPath(CONSTANTS.SENTIO_CHARACTER_DEFAULT_PORTRAIT),
                type: RESOURCE_TYPE.CHARACTER,
            };
            setCharacter(defaultCharacter);
            setLive2dCharacter(defaultCharacter);
        } else {
            setCharacter(character);
            setLive2dCharacter(character);
        }
    }
    
    const setCurrentTheme = (theme: APP_TYPE) => {
        setTheme(theme);
    }

    const setCurrentLipFactor = (lipFactor: number) => {
        setLipFactor(lipFactor);
        Live2dManager.getInstance().setLipFactor(lipFactor);
    }

    const getAppConfig = (): AppConfig => {
        return {
            asr_enable: asrEnable,
            tts_enable: ttsEnable,
            asr: {
                name: asrEngine,
                type: ENGINE_TYPE.ASR,
                config: asrSettings,
            },
            tts: {
                name: ttsEngine,
                type: ENGINE_TYPE.TTS,
                config: ttsSettings
            },
            llm: {
                name: agentEngine,
                type: ENGINE_TYPE.LLM,
                config: agentSettings
            },
            agent: {
                name: agentEngine,
                type: ENGINE_TYPE.AGENT,
                config: agentSettings
            },
            background: background,
            character: character,
            type: theme,
            ext: {
                sound: sound,
                showThink: showThink,
                lip_factor: lipFactor,
                chat_mode: chatMode
            }
        }
    }

    const resetAppEngine = (engine?: string) => {
        setAsrEngine(engine || "default");
        setTtsEngine(engine || "default");
        setAgentEngine(engine || "default");
        setAsrSettings({});
        setTtsSettings({});
        setAgentSettings({});
    }

    const resetAppConfig = () => {
        setAsrEnable(true);
        setTtsEnable(true);
        resetAppEngine();
        clearChatRecord();
        setBackground(null);
        setCharacter(null);
        setSound(true);
        setShowThink(true);
        setCurrentTheme(CONSTANTS.SENTIO_THENE_DEFAULT);
        setCurrentLipFactor(CONSTANTS.SENTIO_LIPFACTOR_DEFAULT);
        setChatMode(CONSTANTS.SENTIO_CHATMODE_DEFULT);
    }

    const setAppConfig = (config: AppConfig) => {
        if (!!config) {
            setAsrEnable(config.asr_enable);
            config.asr && setAsrEngine(config.asr.name);
            config.asr && setAsrSettings(config.asr.config);
            setTtsEnable(config.tts_enable);
            config.tts && setTtsEngine(config.tts.name);
            config.tts && setTtsSettings(config.tts.config);
            config.agent && setAgentEngine(config.agent.name);
            config.agent && setAgentSettings(config.agent.config);
            setBackground(config.background);
            setCurrentCharacter(config.character);
            setTheme(config.type);
            setSound(config.ext.sound);
            setShowThink(config.ext.showThink);
            setCurrentLipFactor(config.ext.lip_factor);
            setChatMode(config.ext.chat_mode);
            Live2dManager.getInstance().setLipFactor(config.ext.lip_factor);
        } else {
            // 新应用使用默认值
            resetAppConfig();
            setCurrentCharacter(null);
        }
        
    }

    return { getAppConfig, setAppConfig, resetAppConfig, resetAppEngine, setCurrentTheme }
}