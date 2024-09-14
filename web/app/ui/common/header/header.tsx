'use client'

import { useEffect } from "react";
import { useHeartbeatStore } from "@/app/lib/store";
import { HeadAlert } from "@/app/ui/common/alert";
import { PROJ_NAME, HEART_BEAT_ALERT, HEART_BEAT_CHECK_1S } from "@/app/lib/constants";
import { WindowMenu } from "./menu";
import Github from "./github";
import Link from "next/link";
import useWebSocket, { ReadyState } from 'react-use-websocket';
import * as API from '@/app/lib/api';



export default function Header() {
    const { heartbeat, setHeartbeat } = useHeartbeatStore();
    const { readyState } = useWebSocket(
        API.get_heatbeat_wss(),
        {
            shouldReconnect: () => true,
            heartbeat: {
                message: 'ping',
                returnMessage: 'pong',
                timeout: 60000,
                interval: HEART_BEAT_CHECK_1S,
            },
        }
    );

    useEffect(() => {
        if (readyState === ReadyState.OPEN) {
            setHeartbeat(true);
        } else {
            setHeartbeat(false);
        }
    }, [readyState]);


    return (
        <header className="text-gray-600 min-w-full h-min z-10">
            {heartbeat ? null : <HeadAlert message={HEART_BEAT_ALERT} />}
            <div className="flex flex-nowrap mx-auto p-1 md:p-5 flex-row items-center justify-between">
                <Link href={"/"} className="flex title-font font-medium items-center text-gray-900 hover:text-gray-600">
                    <img src="/icons/app_icon.svg" className="w-8 h-8 md:w-10 md:h-10 text-white p-2 rounded-full border-2 border-black" />
                    <span className="ml-3 text-sm md:text-xl text-nowrap">{PROJ_NAME}</span>
                </Link>

                {/* <div className="visible md:invisible">
                    <PhoneMenu />
                </div> */}
                <div className="flex items-center">
                    <div className="mr-auto ml-2 md:ml-4 pl-2 md:pl-4">
                        <WindowMenu />
                    </div>
                    <div className="invisible md:visible">
                        <Github />
                    </div>
                </div>
            </div>
        </header>
    );
}