import React, { useState } from 'react';
import { Card, Drawer, Flex, FloatButton, Image, List, Modal, Tabs, Tooltip, Typography } from 'antd';
import { UserSwitchOutlined,  CheckCircleOutlined, EllipsisOutlined, AlibabaOutlined} from '@ant-design/icons';
import { Comm } from '../comm';
import { CharacterManager } from '../characterManager';
import { clear } from '../features/chat';
import { setCharacter, CharacterInfo } from '../features/character';
import { useAppSelector, useAppDispatch } from '../hooks';
const { Meta } = Card;
const { Title, Paragraph, Text, Link } = Typography;

export function CharacterComponent () {
    const [open, setOpen] = useState(false);
    const [portraits, setPortraits] = useState<{[key: string]: string[]}>({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const character: CharacterInfo = useAppSelector((state) => state.character.value);
    const dispatch = useAppDispatch();

    const showModal = () => {
        setIsModalOpen(true);
    };

    const cancleModal = () => {
        setIsModalOpen(false);
    };
  
    const showDrawer = () => {
      setOpen(true);
      setPortraits(Comm.getInstance().getLive2dPortraits());
    };
  
    const onClose = () => {
      setOpen(false);
    };

    const getCharacterFromPortrait = (portrait: string) => {
        return portrait.split("/")[5];
    }

    const onCharacterSelect = (profession: string, portrait: string) => {
        const name = portrait.split("/")[5]
        dispatch(setCharacter({
            name: name,
            portrait: portrait,
            intro: CharacterManager.getInstance().getIntro(profession, name)
         }));
        Comm.getInstance().setLive2dCharacter(profession, getCharacterFromPortrait(portrait));
        dispatch(clear());
    }

    const onCharacterIntro = (profession: string, portrait: string) => {
        const name = portrait.split("/")[5]
        dispatch(setCharacter({
           name: name,
           portrait: portrait,
           intro: CharacterManager.getInstance().getIntro(profession, name)
        }));
        console.log(character);
        showModal();
    }

    const tabItems = (portraits: {[key: string]: string[]}) => {
        let items = [];
        for (const [key, value] of Object.entries(portraits)) {
            items.push(
                {
                    label: key,
                    key: key,
                    children: 
                        <List
                            style={{ overflowY: 'auto', overflowX: 'hidden'}}
                            grid={{ gutter: 16, column: 2 }}
                            dataSource={value}
                            renderItem={(item, index) => 
                                <List.Item>
                                    <Card 
                                        hoverable={true}
                                        cover={<Image height={200} style={{objectFit: "scale-down"}} preview={false} src={item} />}
                                        // onClick={() => onCharacterCardClick(key, item)}
                                        actions={[
                                            <Tooltip title="选择" placement="top" color='green'>
                                                <CheckCircleOutlined key="选择" onClick={() => onCharacterSelect(key, item)}/>
                                            </Tooltip>,
                                            <Tooltip title="介绍" placement="top" color='blue'>
                                                <EllipsisOutlined key="介绍" onClick={() => onCharacterIntro(key, item)}/>
                                            </Tooltip>

                                        ]}
                                    >
                                        <Meta title={getCharacterFromPortrait(item)} />
                                    </Card>
                                </List.Item>
                            }
                        />
                }
            )
        }
        return items;
    }

    return (
        <>
            <Tooltip title="角色" placement="left">
              <FloatButton
                icon={<UserSwitchOutlined />}
                onClick={ showDrawer }
              />
            </Tooltip>
            <Drawer title="角色" onClose={onClose} open={open}>
                <Tabs
                    defaultActiveKey="1"
                    size="small"
                    style={{ marginBottom: 32 }}
                    items={tabItems(portraits)}
                />
            </Drawer>
            <Modal title={character.name} open={isModalOpen} onOk={cancleModal} onCancel={cancleModal} footer={null}>
                <Flex align="center" vertical={true}>
                    <Image height={300} preview={false} src={character.portrait}/>
                    <Typography>
                        <Paragraph>
                            <Text strong>{character.intro}</Text>
                        </Paragraph>
                    </Typography>
                </Flex>
            </Modal>
        </>
    )
}