'use client'

import { useState, useMemo, useRef, useEffect, memo } from 'react';
import { useTranslations } from 'next-intl';
import {
    Button,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    useDisclosure,
    Image,
    Tabs,
    Tab,
    Card,
    CardBody,
    CardFooter,
    Divider,
    Switch,
    Select,
    SelectItem,
    Link,
    useDraggable,
    addToast
} from "@heroui/react";
import { useSentioBackgroundStore, useSentioCharacterStore } from '@/lib/store/sentio';
import { 
    BACKGROUND_TYPE, 
    ResourceModel, 
    CHARACTER_TYPE, 
    RESOURCE_TYPE
} from '@/lib/protocol';
import { BUSINESS_COOPERATION_URL } from '@/lib/constants';
import * as CONSTANTS from '@/lib/constants';
import { getSrcPath } from '@/lib/path';
import { useLive2D } from './hooks/live2d';
import clsx from 'clsx';


interface ResourceModelExtend extends ResourceModel {
    sub_type: BACKGROUND_TYPE | CHARACTER_TYPE
}

function ImagesList({
    current,
    descs,
    enable,
    showType,
    choiceFunc
}: {
    current: ResourceModel | null,
    descs: ResourceModelExtend[],
    enable: boolean,
    showType: BACKGROUND_TYPE | CHARACTER_TYPE,
    choiceFunc: (index: number | null) => void,
}) {
    const allTypes = [BACKGROUND_TYPE.ALL, CHARACTER_TYPE.ALL];
    return (
        <div className="gap-6 grid grid-cols-2 sm:grid-cols-4 max-h-96">
            {enable && descs.map((item, index) => (
                (item.sub_type == showType || allTypes.includes(showType)) && <Card
                    shadow="md"
                    key={index}
                    isPressable
                    onPress={() => choiceFunc(index)}
                    className={clsx(
                        "text-small justify-between h-fit",
                        {
                            'text-blue-600 border-2 border-indigo-600': !!current && item.resource_id == current.resource_id,
                        }
                    )}
                >
                    <CardBody className="overflow-visible p-0">
                        {
                            item.link.endsWith('.mp4') ?
                            <video 
                                className='w-full object-cover h-[120px]' 
                                autoPlay 
                                muted 
                                loop
                                poster={getSrcPath('image/loading.png')}
                                src={item.link}
                                style={{ pointerEvents: 'none' }}
                            />
                            :
                            <Image
                                shadow="sm"
                                radius="lg"
                                width="100%"
                                alt={item.name}
                                className="w-full object-cover h-[120px]"
                                src={item.link}
                                isZoomed={true}
                                style={{ objectFit: "cover" }}
                            />
                        }
                        
                    </CardBody>
                    <CardFooter className="text-small justify-between">
                        <b>{item.name}</b>
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}

function BackgroundsTab() {
    const t = useTranslations('Products.sentio.gallery.backgrounds');
    const { background, setBackground } = useSentioBackgroundStore();
    const [enable, setEnable] = useState<boolean>(background != null);
    const [bgType, setBgType] = useState<string>(t('all'));
    // bgType映射关系
    const bgTypeMap = {
        [t('all')]: BACKGROUND_TYPE.ALL,
        [t('static')]: BACKGROUND_TYPE.STATIC,
        [t('dynamic')]: BACKGROUND_TYPE.DYNAMIC,
    };
    const getBackgrounds = (type: BACKGROUND_TYPE): ResourceModelExtend[] => {
        var backgrounds: ResourceModelExtend[] = [];
        // 静态图 / 动态图 处理
        const images = type == BACKGROUND_TYPE.STATIC ? CONSTANTS.SENTIO_BACKGROUND_STATIC_IMAGES : CONSTANTS.SENTIO_BACKGROUND_DYNAMIC_IMAGES;
        const imagePath = type == BACKGROUND_TYPE.STATIC ? CONSTANTS.SENTIO_BACKGROUND_STATIC_PATH : CONSTANTS.SENTIO_BACKGROUND_DYNAMIC_PATH;

        for (const image of images) {
            // 文件名字
            const name = image.split('.')[0];
            backgrounds.push({
                resource_id: `${type}_${image}`,
                type: RESOURCE_TYPE.BACKGROUND,
                sub_type: type,
                name: name,
                link: getSrcPath(`${imagePath}/${image}`),
            });
        }
        return backgrounds;
    }

    const staticBackgrounds = useMemo(() => getBackgrounds(BACKGROUND_TYPE.STATIC), []);
    const dynamicBackgrounds = useMemo(() => getBackgrounds(BACKGROUND_TYPE.DYNAMIC), []);
    const backgrounds = [...staticBackgrounds, ...dynamicBackgrounds];
    // 背景选择触发函数
    const choiceBackground = (index: number | null) => {
        if (index != null) {
            setBackground(backgrounds[index]);
        } else {
            setBackground(null);
        }
    }

    const onEnableChange = (isSelected: boolean) => {
        setEnable(isSelected);
        if (!isSelected) {
            choiceBackground(null);
        }
    }

    return (
        <Card>
            <CardBody>
                <div className='flex flex-col gap-4 max-h-96 overflow-y-auto'>
                    <Switch defaultSelected={background != null} color="primary" onValueChange={onEnableChange}>{t('enable')}</Switch>
                    <Divider />
                    {
                        enable && <div className='flex flex-row items-center gap-2'>
                            <Select
                                className="max-w-md"
                                name="bgTypeSelect"
                                label={t('select')}
                                key={t('select')}
                                defaultSelectedKeys={[bgType as string]}
                                onSelectionChange={(e) => setBgType(e.currentKey as string)}
                            >
                                {
                                    Object.keys(bgTypeMap).map((key) => (
                                        <SelectItem key={key}>{key}</SelectItem>
                                    ))
                                }
                            </Select>
                        </div>
                    }
                    <ImagesList
                        current={background}
                        descs={backgrounds}
                        enable={enable}
                        showType={bgTypeMap[bgType]}
                        choiceFunc={choiceBackground}
                    />                    
                </div>
            </CardBody>
        </Card>
    )
}

function CharactersTab() {
    const t = useTranslations('Products.sentio.gallery.characters');
    const { character, setCharacter } = useSentioCharacterStore();
    const [characterType, setCharacterType] = useState<string>(t('all'));
    const { setLive2dCharacter } = useLive2D();
    // 映射关系
    const characterTypeMap = {
        [t('all')]: CHARACTER_TYPE.ALL,
        [t('ip')]: CHARACTER_TYPE.IP,
        [t('free')]: CHARACTER_TYPE.FREE,
    };
    const getCharacters = (type: CHARACTER_TYPE): ResourceModelExtend[] => {
        var characters: ResourceModelExtend[] = [];
        // 静态图 / 动态图 处理
        const models = type == CHARACTER_TYPE.FREE ? CONSTANTS.SENTIO_CHARACTER_FREE_MODELS : CONSTANTS.SENTIO_CHARACTER_IP_MODELS;
        const modelPath = type == CHARACTER_TYPE.FREE ? CONSTANTS.SENTIO_CHARACTER_FREE_PATH : CONSTANTS.SENTIO_CHARACTER_IP_PATH;
        for (const model of models) {
            characters.push({
                resource_id: `${type}_${model}`,
                name: model,
                sub_type: type,
                link: getSrcPath(`${modelPath}/${model}/${model}.png`),
                type: RESOURCE_TYPE.CHARACTER
            });
        }
        return characters;
    }

    const freeCharacters = useMemo(() => getCharacters(CHARACTER_TYPE.FREE), [])
    const ipCharacters = useMemo(() => getCharacters(CHARACTER_TYPE.IP), []);
    const characters = [...freeCharacters, ...ipCharacters];

    const choiceCharacter = (index: number | null) => {
        if (index != null) {
            if (character.name == characters[index].name && character.resource_id == characters[index].resource_id) return;
            setCharacter(characters[index]);
            setLive2dCharacter(characters[index]);
        } else {
            setCharacter(null);
        }
    }


    return (
        <Card>
            <CardBody>
                <div className='flex flex-col gap-4 max-h-96 overflow-y-auto'>
                    <div className='flex flex-row items-center gap-2'>
                        <Select
                            className="max-w-md"
                            name="characterTypeSelect"
                            label={t('select')}
                            key={t('select')}
                            defaultSelectedKeys={[characterType as string]}
                            onSelectionChange={(e) => setCharacterType(e.currentKey as string)}
                        >
                            {
                                Object.keys(characterTypeMap).map((key) => (
                                    <SelectItem key={key}>{key}</SelectItem>
                                ))
                            }
                        </Select>
                    </div>

                    <Link className='hover:underline text-sm w-fit ml-2' href={BUSINESS_COOPERATION_URL} color='warning' isExternal>👉 定制人物模型</Link>
                    <ImagesList
                        current={character}
                        descs={characters}
                        enable={true}
                        showType={characterTypeMap[characterType]}
                        choiceFunc={choiceCharacter}
                    />
                </div>
            </CardBody>
        </Card>
    )
}

function GalleryTabs() {
    const t = useTranslations('Products.sentio.gallery');
    return (
        <Tabs aria-label="Gallery">
            <Tab key='characters' title={t('characters.title')}>
                <CharactersTab />
            </Tab>
            <Tab key='backgrounds' title={t('backgrounds.title')}>
                <BackgroundsTab />
            </Tab>
        </Tabs>
    )
}

export function Gallery({ isOpen: open, onClose }: { isOpen: boolean, onClose: () => void }) {
    const t_common = useTranslations('Common');
    const t = useTranslations('Products.sentio.gallery');
    const { isOpen, onOpen, onOpenChange } = useDisclosure({ isOpen: open, onClose });
    const targetRef = useRef(null);
    const { moveProps } = useDraggable({ targetRef, isDisabled: !isOpen });
    return (
        <Modal
            ref={targetRef}
            isOpen={open}
            onOpenChange={onOpenChange}
            size="5xl"
            placement="center"
            scrollBehavior="outside"
        >
            <ModalContent>
                <ModalHeader {...moveProps} className="flex flex-col gap-1">{t('title')}</ModalHeader>
                <ModalBody>
                    <GalleryTabs />
                </ModalBody>
                <ModalFooter>
                    <Button color="danger" variant="light" onPress={onClose}>
                        {t_common('close')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}