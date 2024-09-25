'use client'

import { Image } from "@nextui-org/react";
import { Tabs, Tab } from "@nextui-org/react";
import { Card, CardBody, CardFooter } from "@nextui-org/react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, useDisclosure } from "@nextui-org/react";
import { CharacterManager } from "@/app/lib/character"
import { InteractionMode, useInteractionModeStore, useCharacterStore, useBackgroundStore } from "@/app/lib/store";
import clsx from "clsx";
import { ReactNode } from "react";

function CharacterGallery() {
    const { character, setCharacter } = useCharacterStore();
    const choiceCharacter = (c: string) => {
        if (c === character) return;
        setCharacter(c);
        CharacterManager.getInstance().setCharacter(c);
    }

    const interactionMode = useInteractionModeStore((state) => state.mode)
    const portraits = CharacterManager.getInstance().getLive2dPortraits();

    return (
        interactionMode != InteractionMode.CHATBOT ?
            <div className="gap-6 grid grid-cols-2 sm:grid-cols-4 max-h-96">
                {Object.keys(portraits).map((item, index) => (
                    <Card
                        shadow="md"
                        key={index}
                        isPressable
                        onPress={() => choiceCharacter(item)}
                        className={clsx(
                            "text-small justify-between h-fit",
                            {
                                ' text-blue-600 border-2 border-indigo-600': item === character,
                            },
                        )
                        }
                    >
                        <CardBody className="overflow-visible p-0">
                            <Image
                                shadow="sm"
                                radius="lg"
                                width="100%"
                                alt={item}
                                className="w-full object-cover h-[140px]"
                                src={portraits[item]}
                                isZoomed={true}
                                style={{ objectFit: "scale-down" }}
                            />
                        </CardBody>
                        <CardFooter className="text-small justify-between">
                            <b>{item}</b>
                        </CardFooter>
                    </Card>
                ))}
            </div>
            :
            <span>聊天模式不支持人物设置</span>
    );

}

function BackgroundGallery() {
    const { background, setBackground } = useBackgroundStore();
    const choiceBackground = (b: string | null) => {
        if (b === background) return;
        setBackground(b);
    }

    const interactionMode = useInteractionModeStore((state) => state.mode)
    const backImages: {[key: string]: string} = CharacterManager.getInstance().getBackImages();

    return (
        interactionMode != InteractionMode.CHATBOT ?
            <div className="gap-6 grid grid-cols-2 sm:grid-cols-4 max-h-96">
                {[null, ...Object.keys(backImages)].map((item, index) => (
                    <Card
                        shadow="md"
                        key={index}
                        isPressable
                        onPress={() => choiceBackground(item)}
                        className={clsx(
                            "text-small justify-between h-fit",
                            {
                                ' text-blue-600 border-2 border-indigo-600': item === background,
                            },
                        )
                        }
                    >
                        <CardBody className="overflow-visible p-0">
                            <Image
                                shadow="sm"
                                radius="lg"
                                width="100%"
                                alt={item != null ? item : "empty"}
                                className="w-full object-cover h-[140px]"
                                src={item != null ? backImages[item] : ""}
                                isZoomed={true}
                                style={{ objectFit: "cover" }}
                            />
                        </CardBody>
                        <CardFooter className="text-small justify-between">
                            <b>{item != null ? item : "empty"}</b>
                        </CardFooter>
                    </Card>
                ))}
            </div>
            :
            <span>聊天模式不支持背景设置</span>
    );

}

function GalleryTabs() {
    return (
        <Tabs aria-label="Options">
            <Tab key="character" title="人物">
                <Card>
                    <CardBody>
                        <CharacterGallery />
                    </CardBody>
                </Card>
            </Tab>
            <Tab key="background" title="背景">
                <Card>
                    <CardBody>
                        <BackgroundGallery />
                    </CardBody>
                </Card>
            </Tab>
        </Tabs>
    )
}

export default function Gallery({isOpen: open, trigger, onClose}: {isOpen?: boolean; trigger?:ReactNode; onClose?: () => void}) {
    const { isOpen, onOpen, onOpenChange } = useDisclosure({isOpen: open, onClose});
    return (
        <>
            {
                trigger ? <div onClick={() => {
                    onOpen();
                }}>{trigger}</div> : null
            }
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
                            <ModalHeader className="flex flex-col gap-1">Gallery</ModalHeader>
                            <ModalBody>
                                <div className="flex w-full flex-col">
                                    <GalleryTabs />
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