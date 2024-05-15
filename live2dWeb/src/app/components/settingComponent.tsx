import React, { useState } from 'react';
import { Divider, Drawer, FloatButton, Radio, Tooltip } from 'antd';
import type { RadioChangeEvent } from 'antd';
import { SettingOutlined } from  '@ant-design/icons';
import { useAppSelector, useAppDispatch } from '../hooks';
import { setRepeater, setDialogue } from '../features/mode';

export function SettingComponent () {
    const [open, setOpen] = useState(false);
    const mode = useAppSelector((state) => state.mode.value);
    const dispatch = useAppDispatch();
  
    const showDrawer = () => {
      setOpen(true);
    };
  
    const onClose = () => {
      setOpen(false);
    };

    const onModeChange = (e: RadioChangeEvent) => {
      switch (e.target.value) {
        case "Repeater":
          dispatch(setRepeater());
          break;
        case "Dialogue":
          dispatch(setDialogue());
          break;
        default:
          console.error("Unknown mode");
          break;
      }
    };

    return (
        <>
            <Tooltip title="设置" placement="left">
              <FloatButton
                icon={<SettingOutlined />}
                onClick={ showDrawer }
              />
            </Tooltip>
            <Drawer title="设置" onClose={onClose} open={open}>
              <h3>模式</h3>
              <Radio.Group onChange={onModeChange} value={mode}>
                <Radio value={"Repeater"}>复读机</Radio>
                <Radio value={"Dialogue"}>对话</Radio>
              </Radio.Group>
              <Divider />
            </Drawer>
        </>
    )
}