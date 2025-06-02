import "whatwg-fetch";
import { fetchEventSource } from '@microsoft/fetch-event-source';
import * as PROTOCOL from "../protocol";
import { v4 as uuidv4 } from 'uuid';
import { getHost, errorHandler, get, post, filePost, put, del } from "./requests";

const SERVER_VERSION = process.env.NEXT_PUBLIC_SERVER_VERSION;

const BASE_PATH = "/adh"
// =========================== ASR APIs ===========================
const ASR_PATH = BASE_PATH + `/asr/${SERVER_VERSION}`

export async function api_asr_get_list(): Promise<PROTOCOL.EngineDesc[]>{
    const path = `${ASR_PATH}/engine`;
    return get(path, null).then((response: PROTOCOL.EngineListResponse) => {
        return response.data
    }).catch(() => {
        return [] as PROTOCOL.EngineDesc[]
    })
}

export async function api_asr_get_default(): Promise<PROTOCOL.EngineDesc>{
    const path = `${ASR_PATH}/engine/default`;
    return get(path, null).then((response: PROTOCOL.EngineDefaultResponse) => {
        return response.data
    }).catch(() => {
        return {} as PROTOCOL.EngineDesc
    })
}

export async function api_asr_get_config(engine: string): Promise<PROTOCOL.EngineParamDesc[]>{
    const path = `${ASR_PATH}/engine/${engine}`;
    return get(path, null).then((response: PROTOCOL.EngineConfigResponse) => {
        return response.data;
    }).catch(() => {
        return [] as PROTOCOL.EngineParamDesc[];
    })
}

export async function api_asr_infer(
    engine: string,
    config: {},
    data: string | Blob,
    type: string = PROTOCOL.AUDIO_TYPE.WAV as string,
    sampleRate: Number = 16000,
    sampleWidth: Number = 2
): Promise<string> {
    const path = `${ASR_PATH}/engine`;
    const body = JSON.stringify({
        engine: engine,
        config: config,
        data: data,
        type: type,
        sampleRate: sampleRate,
        sampleWidth: sampleWidth
    });
    return post(path, body, null).then((response: PROTOCOL.StringResponse) => {
        return response.data;
    }).catch(() => {
        return "";
    })
}

export async function api_asr_infer_file(
    engine: string,
    config: {},
    data: Blob,
    type: string = PROTOCOL.AUDIO_TYPE.MP3 as string,
    sampleRate: Number = 16000,
    sampleWidth: Number = 2
): Promise<string> {
    const path = `${ASR_PATH}/engine/file`;
    const formData = new FormData();
    const mp3File = new File([data], 'file.mp3', { type: 'audio/mp3' })
    formData.append('file', mp3File)
    formData.append('engine', engine);
    formData.append('config', JSON.stringify(config));
    formData.append('type', type);
    formData.append('sampleRate', String(sampleRate));
    formData.append('sampleWidth', String(sampleWidth));

    return filePost(path, formData, null).then((response: PROTOCOL.StringResponse) => {
        return response.data;
    }).catch(() => {
        return "";
    })
}

// =========================== TTS APIs ===========================
const TTS_PATH = BASE_PATH + `/tts/${SERVER_VERSION}`

export async function api_tts_get_list(): Promise<PROTOCOL.EngineDesc[]>{
    const path = `${TTS_PATH}/engine`;
    return get(path, null).then((response: PROTOCOL.EngineListResponse) => {
        return response.data
    }).catch(() => {
        return [] as PROTOCOL.EngineDesc[]
    })
}

export async function api_tts_get_voice(
    engine: string,
): Promise<PROTOCOL.VoiceDesc[]>{
    const path = `${TTS_PATH}/engine/${engine}/voice`;
    return get(path, null).then((response: PROTOCOL.VoiceListResponse) => {
        return response.data
    }).catch(() => {
        return [] as PROTOCOL.VoiceDesc[]
    })
}

export async function api_tts_get_default(): Promise<PROTOCOL.EngineDesc>{
    const path = `${TTS_PATH}/engine/default`;
    return get(path, null).then((response: PROTOCOL.EngineDefaultResponse) => {
        return response.data
    }).catch(() => {
        return {} as PROTOCOL.EngineDesc
    })
}

export async function api_tts_get_config(
    engine: string,
): Promise<PROTOCOL.EngineParamDesc[]>{
    const path = `${TTS_PATH}/engine/${engine}`;
    return get(path, null).then((response: PROTOCOL.EngineConfigResponse) => {
        return response.data;
    }).catch(() => {
        return [] as PROTOCOL.EngineParamDesc[];
    })
}

export async function api_tts_infer(
    engine: string,
    config: {},
    data: string,
    signal: AbortSignal,
): Promise<string> {
    const path = `${TTS_PATH}/engine`;
    const body = JSON.stringify({
        engine: engine,
        config: config,
        data: data,
    });
    return post(path, body, signal).then((response: PROTOCOL.BaseResponse) => {
        return response.data;
    }).catch(() => {
        return "";
    })
}

// =========================== Agent APIs ===========================
const AGENT_PATH = BASE_PATH + `/agent/${SERVER_VERSION}`

export async function api_agent_get_list(): Promise<PROTOCOL.EngineDesc[]> {
    const path = `${AGENT_PATH}/engine`;
    return get(path, null).then((response: PROTOCOL.EngineListResponse) => {
        return response.data
    }).catch(() => {
        return [] as PROTOCOL.EngineDesc[]
    })
}

export async function api_agent_get_default(): Promise<PROTOCOL.EngineDesc> {
    const path = `${AGENT_PATH}/engine/default`;
    return get(path, null).then((response: PROTOCOL.EngineDefaultResponse) => {
        return response.data
    }).catch(() => {
        return {} as PROTOCOL.EngineDesc
    })
}

export async function api_agent_get_config(
    engine: string
): Promise<PROTOCOL.EngineParamDesc[]> {
    const path = `${AGENT_PATH}/engine/${engine}`;
    return get(path, null).then((response: PROTOCOL.EngineConfigResponse) => {
        return response.data;
    }).catch(() => {
        return [] as PROTOCOL.EngineParamDesc[];
    })
}

export async function api_agent_create_conversation(
    engine: string,
    config: {},
): Promise<string>{
    const path = `${AGENT_PATH}/engine/${engine}`;
    const body = JSON.stringify({
        engine: engine,
        data: config,
    });
    return post(path, body, null).then((response: PROTOCOL.StringResponse) => {
        return response.data;
    }).catch(() => {
        return "";
    })
}

export function api_agent_stream(
    engine: string,
    config: {},
    data: string,
    conversation_id: string,
    signal: AbortSignal,
    onOk: (response: PROTOCOL.EventResponse) => void,
    onError: (error: Error) => void = (error) => {}
){
    const path = `${AGENT_PATH}/engine`
    const url = getHost() + path;
    fetchEventSource(url, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            'Request-Id': uuidv4(),
            'User-Id': "",
        },
        body: JSON.stringify({
            engine: engine,
            config: config,
            data: data,
            conversation_id: conversation_id
        }),
        signal: signal,
        onmessage: (msg) => {
            const { event, data } = msg;
            const eventResp : PROTOCOL.EventResponse = {
                event: event as PROTOCOL.STREAMING_EVENT_TYPE,
                data: data
            }
            onOk(eventResp)
        },
        onerror(error) {
            throw new Error(error)
        },
    }).catch((error) => {
        errorHandler(error, signal)
    })
}

// =========================== Custom APIs ===========================
export async function api_get_engine_list(
    engineType: string
){
    switch (engineType){
        case PROTOCOL.ENGINE_TYPE.ASR:
            return api_asr_get_list();
        case PROTOCOL.ENGINE_TYPE.TTS:
            return api_tts_get_list();
        case PROTOCOL.ENGINE_TYPE.AGENT:
            return api_agent_get_list();
    }
}

export async function api_get_engine_default(
    engineType: string
){
    switch (engineType){
        case PROTOCOL.ENGINE_TYPE.ASR:
            return api_asr_get_default();
        case PROTOCOL.ENGINE_TYPE.TTS:
            return api_tts_get_default();
        case PROTOCOL.ENGINE_TYPE.AGENT:
            return api_agent_get_default();
    }
}

export function api_get_engine_config(
    engineType: string,
    engine: string
){
    switch (engineType){
        case PROTOCOL.ENGINE_TYPE.ASR:
            return api_asr_get_config(engine);
        case PROTOCOL.ENGINE_TYPE.TTS:
            return api_tts_get_config(engine);
        case PROTOCOL.ENGINE_TYPE.AGENT:
            return api_agent_get_config(engine);
    }
}