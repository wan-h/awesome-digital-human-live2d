'use client'

import React, { useState, useEffect, memo, useRef } from "react";
import { useTranslations } from 'next-intl';
import {
    Divider,
    Switch,
    Autocomplete,
    AutocompleteItem,
    Link,
    Skeleton,
    addToast
} from "@heroui/react";
import { Card, CardBody } from "@heroui/react";
import { 
    api_get_engine_list, 
    api_get_engine_default, 
    api_get_engine_config, 
    api_tts_get_voice 
} from '@/lib/api/server';
import { ENGINE_TYPE, EngineParamDesc, EngineDesc } from '@/lib/protocol';
import {
    useSentioAsrStore,
    useSentioTtsStore,
    useSentioAgentStore,
    useChatRecordStore,
} from "@/lib/store/sentio";
import { InfoTip } from "@/components/tips/info";
import {ParamsLoading, ParamsList} from "./params";
import { AsrModeSettings } from "./asrMode";

const EngineSelector = memo(({
    engine,
    engineList,
    onEngineChange
}: {
    engine: string,
    engineList: { [key: string]: EngineDesc },
    onEngineChange: (e: string | null) => void
}) => {
    const contentRender = () => {
        return (
            <div className="flex flex-col gap-1">
                <p className="font-bold">{engineList[engine]?.desc}</p>
                {engineList[engine]?.meta.official && <Link href={engineList[engine].meta.official} isExternal className="text-xs hover:underline">👉 前往官网</Link>}
                {engineList[engine]?.meta.configuration && <Link href={engineList[engine].meta.configuration} isExternal className="text-xs hover:underline">👉 如何配置</Link>}
                {engineList[engine]?.meta.tips && <p className="text-xs text-yellow-500">{`Tips: ${engineList[engine].meta.tips}`}</p>}
                <p className="text-xs text-green-500">{`(${engineList[engine]?.meta.fee})`}</p>
            </div>
        )
    }
    return (
        <div className="flex flex-row gap-2">
            <Autocomplete
                className="max-w-xs"
                color="warning"
                aria-label='engineSelect'
                key="engineSelect"
                name="engineSelect"
                selectedKey={engine}
                onSelectionChange={(e) => onEngineChange(e as string)}
            >
                {
                    Object.values(engineList).map((engine) => (
                        <AutocompleteItem key={engine.name}>{engine.name}</AutocompleteItem>
                    ))
                }
            </Autocomplete>
            <InfoTip content={contentRender()}/>
        </div>
    )
});

const EngineSelectorLoading = () => {
    return (
        <Skeleton className="max-w-xs rounded-lg">
          <div className="h-8 max-w-xs rounded-lg bg-default-300" />
        </Skeleton>
    )
}


export const EngineTab = memo(({ engineType }: { engineType: ENGINE_TYPE }) => {
    const t = useTranslations('Products.sentio.settings');
    const { clearChatRecord } = useChatRecordStore();
    const { enable, engine, settings, setEnable, setEngine, setSettings } = (() => {
        switch (engineType) {
            case ENGINE_TYPE.ASR:
                return useSentioAsrStore();
            case ENGINE_TYPE.TTS:
                return useSentioTtsStore();
            case ENGINE_TYPE.AGENT:
                return useSentioAgentStore();
        }
    })();

    const [ isLoadingEngineList, setIsLoadingEngineList ] = useState(true);
    const [ isLoadingEngineParams, setIsLoadingEngineParams ] = useState(true);
    const engineList = useRef<{[key: string]: EngineDesc}>({});
    const engineParams = useRef<EngineParamDesc[]>([]);

    const getEngineParams = (engineType: ENGINE_TYPE, engine: string) => {
        // 获取当前引擎配置参数
        api_get_engine_config(engineType, engine).then((params) => {
            // 更新参数列表
            let newSettings: { [key: string]: any } = {};
            for (var id in params) {
                let param = params[id];
                newSettings[param.name] = param.default;
            }
            // 后端参数数量更新, 根据数量进行热更新
            if (Object.keys(settings).length != params.length) {
                setSettings(newSettings);
            }
            // 填充默认值
            if (Object.keys(newSettings).length > 0) {
                for (var id in params) {
                    let param = params[id];
                    if (param.name in settings) {
                        param.default = settings[param.name];
                    }
                }
            }
            engineParams.current = params;

            // 获取TTS支持的语音列表(支持获取语音列表的引擎)
            if (engineType == ENGINE_TYPE.TTS && 'voice' in newSettings) {
                api_tts_get_voice(engine).then((voices) => {
                    // 填充声音列表
                    for (var id in params) {
                        let param = params[id];
                        if (param.name == 'voice') {
                            param.choices = voices.map((voice) => voice.name);
                            break;
                        }
                    }
                    // 更新语音列表
                    engineParams.current = params;
                    setIsLoadingEngineParams(false);
                })
            } else {
                setIsLoadingEngineParams(false);
            }
        })
    };

    const onEngineChange = (e: string | null) => {
        // 切换引擎
        if (e == null) {
            return;
        }
        setIsLoadingEngineParams(true);
        clearChatRecord();
        engineParams.current = [];
        setEngine(e);
        getEngineParams(engineType, e);
    };

    useEffect(() => {
        // 获取引擎列表
        api_get_engine_list(engineType).then((engines: EngineDesc[]) => {
            engineList.current = engines.reduce((el: { [key: string]: EngineDesc }, engine) => {
                el[engine.name] = engine;
                return el;
            }, {});
            
            setIsLoadingEngineList(false);

            const names = engines.map((engine) => engine.name);
            if (names.includes(engine)) {
                // 存在存储引擎时加载
                setIsLoadingEngineParams(true);
                engineParams.current = [];
                setEngine(engine);
                getEngineParams(engineType, engine);
            } else {
                // 不存在时获取默认引擎
                api_get_engine_default(engineType).then((engine) => {
                    onEngineChange(engine.name);
                })
            }
        });
    }, []);

    const EnineEnable = memo(({
        show,
        onSelect
    }: {
        show: boolean,
        onSelect: (isSelected: boolean) => void
    }) => {
        return (
            show &&
            <div className="flex flex-col gap-4">
                <Switch isSelected={enable} color="primary" onValueChange={onSelect}>{t('switch')}</Switch>
                <Divider />
            </div>
        )
    });

    return (
        <Card>
            <CardBody className="p-4">
                <div className="flex flex-col gap-4">
                    <EnineEnable 
                        show={engineType != ENGINE_TYPE.AGENT} 
                        onSelect={(onSelected) => setEnable(onSelected)}
                    />
                    {
                        enable &&
                        <>
                            <div className="flex flex-col gap-1">
                                <p className="m-2 text-lg">{t('selectEngine')}</p>
                                {
                                    isLoadingEngineList? 
                                    <EngineSelectorLoading /> 
                                    : 
                                    <EngineSelector 
                                        engine={engine}
                                        engineList={engineList.current}
                                        onEngineChange={onEngineChange}
                                    />
                                }
                            </div>
                            
                            <div className="flex flex-col gap-1 w-full">
                                <p className="m-2 text-lg">{t('engineConfig')}</p>
                                <div className="flex flex-col gap-1">
                                    {
                                        isLoadingEngineParams?
                                        <ParamsLoading />
                                        :
                                        <ParamsList params={engineParams.current} settings={settings} setSettings={setSettings}/>
                                    }
                                </div>
                            </div>
                        </>
                    }

                </div>
            </CardBody>
        </Card>
    )
});

export function ASRTab() {
    return (
        <div className="flex flex-col gap-4">
            <AsrModeSettings />
            <EngineTab engineType={ENGINE_TYPE.ASR} />
        </div>
    )
}

export function TTSTab() {
    return (
        <EngineTab engineType={ENGINE_TYPE.TTS} />
    )
}

export function AgentTab() {
    return (
        <EngineTab engineType={ENGINE_TYPE.AGENT} />
    )
}