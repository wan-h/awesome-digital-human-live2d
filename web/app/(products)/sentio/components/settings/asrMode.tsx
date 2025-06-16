'use client';

import { memo } from 'react';
import { Switch, Card, CardBody, CardHeader } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { useSentioAsrStore } from '@/lib/store/sentio';

/**
 * ASR模式设置组件
 * 允许用户在传统ASR和流式ASR之间切换
 */
export const AsrModeSettings = memo(() => {
    const t = useTranslations('Products.sentio');
    const { streamMode, setStreamMode } = useSentioAsrStore();

    const handleStreamModeChange = (enabled: boolean) => {
        setStreamMode(enabled);
    };

    return (
        <Card className="w-full">
            <CardHeader className="pb-2">
                <h3 className="text-lg font-semibold">ASR 识别模式</h3>
            </CardHeader>
            <CardBody className="pt-0">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">
                                流式语音识别
                            </span>
                            <span className="text-xs text-gray-500">
                                实时语音识别，边说边识别，响应更快，请选择支持流式识别的Engine
                            </span>
                        </div>
                        <Switch
                            isSelected={streamMode}
                            onValueChange={handleStreamModeChange}
                            color="primary"
                            size="sm"
                        />
                    </div>
                    
                    <div className="text-xs text-gray-400 border-t pt-2">
                        <p className="mb-1">
                            <strong>传统模式:</strong> 录音完成后进行识别，准确率较高
                        </p>
                        <p>
                            <strong>流式模式:</strong> 实时识别语音，响应速度快，支持部分结果显示
                        </p>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
});

AsrModeSettings.displayName = 'AsrModeSettings';