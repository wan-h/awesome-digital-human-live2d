'use client'

import React from "react";
import { useTranslations } from 'next-intl';
import {
    Switch,
    Slider,
} from "@heroui/react";
import { Card, CardBody } from "@heroui/react";
import {
    useSentioBasicStore,
} from "@/lib/store/sentio";
import { Live2dManager } from "@/lib/live2d/live2dManager";
import * as CONSTANTS from '@/lib/constants';


export function BasicTab() {
    const t = useTranslations('Products.sentio.settings.basic');
    const { sound, lipFactor, showThink, setSound, setLipFactor, setShowThink } = useSentioBasicStore();
    const renderPraram = (name: string, component: React.ReactNode) => {
        return (
            <div className="flex flex-col gap-2">
                <p>{name}</p>
                {component}
            </div>
        )
    }

    return (
        <Card>
            <CardBody>
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col mt-2 gap-6">
                        {
                            renderPraram(
                                t('soundSwitch'),
                                <Switch isSelected={sound} color="primary" onValueChange={(isSelected) => {
                                    setSound(isSelected);
                                }}/>
                            )
                        }
                        {
                            renderPraram(
                                t('showThink'),
                                <Switch isSelected={showThink} color="primary" onValueChange={(isSelected) => {
                                    setShowThink(isSelected);
                                }}/>
                            )
                        }
                        {
                            renderPraram(
                                t('lipFactor'),
                                <Slider
                                    className='max-w-md'
                                    defaultValue={lipFactor}
                                    minValue={CONSTANTS.SENTIO_LIPFACTOR_MIN}
                                    maxValue={CONSTANTS.SENTIO_LIPFACTOR_MAX}
                                    step={0.1}
                                    label=" "
                                    onChangeEnd={(value) => {
                                        const newFactor = typeof value === 'number' ? value : value[0];
                                        setLipFactor(newFactor);
                                        Live2dManager.getInstance().setLipFactor(newFactor);
                                    }}
                                />
                            )
                        }
                    </div>
                </div>
            </CardBody>
        </Card>
    )
}
