import { memo, use } from 'react';
import { EngineParamDesc, PARAM_TYPE } from '@/lib/protocol';
import {
    Autocomplete,
    AutocompleteItem,
    Input,
    Skeleton
} from "@heroui/react";
import VoiceSelector from "../selector/voiceSelector";
import { ValueSlider } from "@/components/slider/valueSlider";

export function ParamsLoading() {
    return (
        <div className="space-y-3">
            <Skeleton className="max-w-xs rounded-lg">
            <div className="h-8 max-w-xs rounded-lg bg-default-200" />
            </Skeleton>
            <Skeleton className="max-w-xs rounded-lg">
            <div className="h-8 max-w-xs rounded-lg bg-default-200" />
            </Skeleton>
            <Skeleton className="max-w-xs rounded-lg">
            <div className="h-8 max-w-xs rounded-lg bg-default-300" />
            </Skeleton>
        </div>
    )
}

export const ParamsList = memo(({
    params, 
    settings,
    setSettings
}: {
    params: EngineParamDesc[], 
    settings: {[key: string]: any},
    setSettings: (settings: { [key: string]: any }) => void
}) => {
    return (
        <>
            {
                params.map((config: EngineParamDesc) => {
                    switch (config.type) {
                        // 字符串类型
                        case PARAM_TYPE.STRING:
                            if (config.choices.length > 0) {
                                // 可选字符串类型
                                return (
                                    config.name == 'voice' ?
                                    <VoiceSelector 
                                        name={config.name}
                                        key={config.name}
                                        description={config.description}
                                        required={config.required}
                                        choices={config.choices as string[]}
                                        default={config.default as string}
                                    />
                                    :
                                    <Autocomplete
                                        className="max-w-md"
                                        isReadOnly={true}
                                        name={config.name}
                                        label={config.name}
                                        key={config.name}
                                        required={config.required}
                                        placeholder={config.description}
                                        selectedKey={settings[config.name] as string}
                                        onSelectionChange={
                                            (e: any) => {
                                                setSettings({ ...settings, [config.name]: e as string })
                                            }
                                        }
                                    >
                                        {
                                            config.choices.map((choice) => (
                                                <AutocompleteItem key={choice as string}>{choice}</AutocompleteItem>
                                            ))
                                        }
                                    </Autocomplete>
                                )
                            } else {
                                // 可输入字符串类型
                                return (
                                    <Input
                                        className="max-w-md"
                                        name={config.name}
                                        label={config.name}
                                        key={config.name}
                                        required={config.required}
                                        placeholder={config.description}
                                        value={settings[config.name] as string}
                                        onValueChange={
                                            (value) => {
                                                setSettings({ ...settings, [config.name]: value as string })
                                            }
                                        }
                                    />
                                )
                            }
                        // 整数类型
                        case PARAM_TYPE.INT:
                        case PARAM_TYPE.FLOAT:
                            // 范围选择
                            if (config.range.length > 0) {
                                return (
                                    <ValueSlider
                                        label={config.name}
                                        description={config.description}
                                        key={config.description}
                                        minValue={config.range[0] as number}
                                        maxValue={config.range[1] as number}
                                        defaultValue={config.default as number}
                                        step={config.type == PARAM_TYPE.INT ? 1 : 0.01}
                                        onChange={
                                            (value) => {
                                                setSettings({ ...settings, [config.name]: value as number })
                                            }
                                        }
                                    />
                                )
                            }
                            // 可选数值
                            if (config.choices.length > 0) {
                                return (
                                    <Autocomplete
                                        className="max-w-xs"
                                        isReadOnly={true}
                                        name={config.name}
                                        label={config.name}
                                        key={config.name}
                                        required={config.required}
                                        placeholder={config.description}
                                        selectedKey={settings[config.name] as string}
                                        onSelectionChange={
                                            (e: any) => {
                                                setSettings({ ...settings, [config.name]: e as string })
                                            }
                                        }
                                    >
                                        {
                                            config.choices.map((choice) => (
                                                <AutocompleteItem key={choice as string}>{choice}</AutocompleteItem>
                                            ))
                                        }
                                    </Autocomplete>
                                )
                            }
                        // TODO: 布尔类型
                        case PARAM_TYPE.BOOL:
                            return;
                    }
                })
            }
        </>
    )
});
