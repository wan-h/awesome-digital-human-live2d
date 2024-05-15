import React, { useState } from 'react';
import { Button, Drawer, FloatButton, Input, List, Space, Tooltip  } from 'antd';
import { MessageOutlined, RobotOutlined, SendOutlined, UserOutlined } from  '@ant-design/icons';
import { Comm } from "../comm"
import { CharacterInfo } from '../features/character';
import { useAppSelector, useAppDispatch } from '../hooks';
import { addMessage } from '../features/chat';

const AI_NAME = "Awesome-digital-human";
const USER_NAME = "Human";

export function MessageComponent () {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [disableInput, setDisableInput] = useState(false);
    const chatContent = useAppSelector((state) => state.chatContent.value);
    const mode = useAppSelector((state) => state.mode.value);
    const character: CharacterInfo = useAppSelector((state) => state.character.value);
    const dispatch = useAppDispatch();
  
    const showDrawer = () => {
      setOpen(true);
    };

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    }

    const onClick = () => {
      setDisableInput(true);
      dispatch(addMessage({name: USER_NAME, message: inputValue}));
      Comm.getInstance().chat(mode, inputValue, character.name).then((resp) => {
        dispatch(addMessage({name: AI_NAME, message: resp}));
        setDisableInput(false);
      });
      setInputValue("");
    }
  
    const onClose = () => {
      setOpen(false);
    };
  
    return (
      <>
        <Tooltip title="对话" placement="left">
          <FloatButton
            icon={<MessageOutlined />}
            onClick={ showDrawer } 
          />
        </Tooltip>
        <Drawer title="聊天记录" onClose={onClose} open={open}>
          {/* <Flex gap="middle" vertical> */}
            <List
              style={{height: "90%", overflowY: 'auto'}}
              itemLayout='horizontal'
              dataSource={chatContent}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={item.name==AI_NAME? <RobotOutlined />: <UserOutlined />}
                    title={item.name}
                    description={item.message}
                  />
                </List.Item>
              )}
            />
            
            <Space.Compact
              style={{width: "90%", position: 'absolute', bottom: 30}}
            >
              <Input 
                value={inputValue}
                onChange={onChange}
                onPressEnter={onClick}
                disabled={disableInput}
              />
              <Button 
                type="primary"
                icon={<SendOutlined />}
                onClick={onClick}
              />
            </Space.Compact>
        </Drawer>
      </>
    )
  }
  