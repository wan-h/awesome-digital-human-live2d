'use client'

import { useState, useRef, memo } from "react";
import { Autocomplete, AutocompleteItem, Button } from "@heroui/react";
import { useSentioTtsStore } from "@/lib/store/sentio";
import { PauseCircleIcon, PlayCircleIcon } from "@heroicons/react/24/outline";
import { api_tts_infer } from "@/lib/api/server";
import { base64ToArrayBuffer } from "@/lib/func";
import { SENTIO_VOICE_TEST_ZH, SENTIO_VOICE_TEST_EN } from '@/lib/constants';

function VoiceSelector(props: {
    name: string, 
    key: string,
    description: string, 
    required: boolean, 
    choices: string[], 
    default: string, 
}) {
    const [ isPlaying, setIsPlaying ] = useState(false);
    const [ startConverting, setStartConverting ] = useState(false);
    const { engine, settings, setSettings } = useSentioTtsStore();
    const controller = useRef<AbortController | null>(null);
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ausioSource = useRef<AudioBufferSourceNode | null>(null);

    const ttsCallback = (audio: string) => {
        const audioData = base64ToArrayBuffer(audio);
        // 播放音频
        const playAudioBuffer = (buffer: AudioBuffer) => {
            var source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            // 监听音频播放完毕事件
            source.onended = () => {
                setIsPlaying(false);
                ausioSource.current = null;
                controller.current = null;
            };
            source.start();
            ausioSource.current = source;
        }
        // 创建一个新的 ArrayBuffer 并复制数据, 防止原始数据被decodeAudioData释放
        const newAudioData = audioData.slice(0);
        setStartConverting(false);
        audioContext.decodeAudioData(newAudioData).then(
            (buffer: AudioBuffer) => {
                playAudioBuffer(buffer);
            }
        );

    }
    const ttsErrorCallback = () => {
        setIsPlaying(false);
        setStartConverting(false);
        controller.current = null;
        ausioSource.current = null;
    }
    const startAudio = () => {
        setIsPlaying(true);
        setStartConverting(true);
        controller.current = new AbortController();
        const testInput = SENTIO_VOICE_TEST_ZH[Math.floor(Math.random() * SENTIO_VOICE_TEST_ZH.length)] 
        api_tts_infer(
            engine, 
            settings, 
            testInput, 
            controller.current.signal, 
        ).then((audio) => {
            if (!!audio) {
                ttsCallback(audio);
            } else {
                ttsErrorCallback();
            }
        })
    }
    const stopAudio = () => {
        if (controller.current) {
            controller.current.abort();
            controller.current = null;
        }
        if (ausioSource.current) {
            ausioSource.current.stop();
            ausioSource.current = null;
        }
        setIsPlaying(false);
    }
    const onSelectionChange = (e: any) => {
        setSettings({ ...settings, [props.name]: e as string })
    }
    return (
        <div className="flex flex-row items-center justify-center max-w-md gap-2">
            <Autocomplete
                name={props.name}
                label={props.name}
                required={props.required}
                placeholder={props.description}
                selectedKey={settings[props.name] as string}
                onSelectionChange={onSelectionChange}
            >
                {
                    props.choices.map((choice) => (
                        <AutocompleteItem key={choice as string}>{choice}</AutocompleteItem>
                    ))
                }
            </Autocomplete>
            <Button isIconOnly isLoading={startConverting} aria-label="play audio" variant="light">
                {
                    isPlaying ? <PauseCircleIcon className="size-6" onClick={stopAudio} /> : <PlayCircleIcon className="size-6" onClick={startAudio} />
                }
            </Button>
        </div>
    )
}

export default memo(VoiceSelector);