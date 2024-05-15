import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks';
import { activate, deactivate } from '../features/alive';
import { Alert } from 'antd';
import { Comm } from '../comm';

const HeartbeatCheck1s = 1000;

export function AlertComponent () {
    const isAlive = useAppSelector((state) => state.liveState.value);
    const dispatch = useAppDispatch();

    useEffect(() => {
        // 设置心跳包
        let intervalID = setInterval(() => {
            Comm.getInstance().getHeartbeat().then((resp) => {
                if (isAlive == resp) {
                  return;
                }
                if (resp) {
                    dispatch(activate());
                } else {
                    dispatch(deactivate());
                }
            });
        }, HeartbeatCheck1s);

        return () => {
            clearInterval(intervalID);
        }
    }, [isAlive]);

    return (
        <>
            {isAlive? <></>: <Alert type="warning" message="Soul is death!" showIcon={true} />}
        </>
    )
}