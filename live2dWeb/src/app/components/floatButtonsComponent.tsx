import React from 'react';
import { FloatButton } from 'antd';
import { MessageComponent } from './messageComponent';
import { SettingComponent } from './settingComponent';
import { CharacterComponent } from './characterComponent';

export function FloatButtonsComponent () {
    return (
        <FloatButton.Group>
            <CharacterComponent />
            <MessageComponent />
            <SettingComponent />
        </FloatButton.Group>
    )
}