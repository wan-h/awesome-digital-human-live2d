'use client'

import React, { useEffect, useState, useRef } from "react";
import { Tabs, Tab, Card, CardBody } from "@nextui-org/react";
import { RadioGroup, Radio, Divider, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, useDisclosure } from "@nextui-org/react";
import { InteractionMode, useInteractionModeStore, useAgentModeStore, useAgentEngineSettingsStore, useMuteStore } from "@/app/lib/store";
import { Comm } from "@/app/lib/comm";

function SettingBasic() {
    // 设置交互模式
    const { mute, setMute } = useMuteStore();
    const { mode } = useInteractionModeStore();
    const interactionModeRations = (Object.values(InteractionMode) as Array<string>).map((mode) => (
        <Radio key={mode} value={mode}>{mode}</Radio>
    ));
    const interactionModeRationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        useInteractionModeStore.setState({ mode: e.target.value as InteractionMode })
    };
    const muteRationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMute(e.target.value === "close")
    }

    return (
        <Card>
            <CardBody>
                <div className="flex flex-col gap-4">
                    <RadioGroup
                        label="选择交互模式"
                        defaultValue={mode}
                        onChange={interactionModeRationChange}
                        orientation="horizontal"
                    >
                        {interactionModeRations}
                    </RadioGroup>
                    <RadioGroup
                        label="声音选项"
                        defaultValue={mute ? "close" : "open"}
                        onChange={muteRationChange}
                        orientation="horizontal"
                    >
                        <Radio value={"open"}>开启</Radio>
                        <Radio value={"close"}>关闭</Radio>
                    </RadioGroup>
                </div>
            </CardBody>
        </Card>
    )
}

function AgentSettingsComponent(props: { engine: string }) {
    const { engine } = props;
    const { agentSettings, setAgentSettings } = useAgentEngineSettingsStore();
    const agentSetting = agentSettings[engine];
    const [inputSettings, setInputSettings] = useState(agentSetting);
    
    useEffect(() => {
        setInputSettings(agentSetting);
    }, [agentSettings, engine])

    const handleSettingChange = () => {
        console.log(inputSettings);
        setAgentSettings(engine, inputSettings);
    }
    const handleInputChange = (name: string, value: string) => {
        let newInputSettings = inputSettings;
        // 更新对应的值
        for (let i = 0; i < newInputSettings.length; i++) {
            if (newInputSettings[i].NAME == name) {
                newInputSettings[i].DEFAULT = value;
                break;
            }
        }
        setInputSettings(newInputSettings);
    }
    return (
        agentSetting.length > 0 ?
            <div className="flex flex-col w-full flex-wrap md:flex-nowrap gap-4 mt-4 items-center">
                {
                    agentSetting.map((setting) =>
                        <Input
                            key={setting.NAME}
                            label={setting.NAME}
                            defaultValue={setting.DEFAULT}
                            onChange={(e) => { handleInputChange(setting.NAME, e.target.value) }}
                        />
                    )
                }
                <Button className="self-end" color="primary" onPress={handleSettingChange}>确认</Button>
            </div>
            :
            <></>
    )
}

function SettingServer() {
    const { agentEngine, setAgentEngine } = useAgentModeStore();
    const [agentsList, setAgentsList] = useState([]);

    const agentEngineRationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAgentEngine(e.target.value);
    };

    if (agentsList.length == 0) {
        Comm.getInstance().getAgentsList().then((agents) => setAgentsList(agents));
    }

    return (
        <Card>
            <CardBody>
                <div className="flex flex-col gap-4">
                    <RadioGroup
                        label="选择Agent模式"
                        defaultValue={agentEngine}
                        onChange={agentEngineRationChange}
                        orientation="horizontal"
                    >
                        {agentsList.map((agent) => <Radio key={agent} value={agent}>{agent}</Radio>)}
                    </RadioGroup>
                    <AgentSettingsComponent engine={agentEngine} />
                </div>
            </CardBody>
        </Card>

    )
}

function SettingsTabs() {
    return (
        <Tabs aria-label="Options">
            <Tab key="basic" title="基础">
                <SettingBasic />
            </Tab>
            <Tab key="server" title="服务">
                <SettingServer />
            </Tab>
        </Tabs>
    )
}

export default function Settings() {
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    return (
        <>
            <div onClick={onOpen}>Settings</div>
            <Modal
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                size="5xl"
                placement="center"
                scrollBehavior="outside"
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">Settings</ModalHeader>
                            <ModalBody>
                                <div className="flex w-full flex-col">
                                    <SettingsTabs />
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button color="danger" variant="light" onPress={onClose}>
                                    Close
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    );
}
