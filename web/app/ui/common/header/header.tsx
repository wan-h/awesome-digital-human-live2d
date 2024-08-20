'use client'

import { useEffect } from "react";
import { useHeartbeatStore } from "@/app/lib/store";
import { HeadAlert } from "@/app/ui/common/alert";
import { Comm } from "@/app/lib/comm";
import { PROJ_NAME, PROJ_DESC, HEART_BEAT_ALERT, HEART_BEAT_CHECK_1S } from "@/app/lib/constants";
import { PhoneMenu, WindowMenu } from "./menu";
import Github from "./github";
import Link from "next/link";

export default function Header() {
    const { heartbeat, setHeartbeat } = useHeartbeatStore();

    useEffect(() => {
        // 设置心跳包
        let intervalID = setInterval(() => {
            // 心跳请求
            Comm.getInstance().getHeartbeat().then((resp) => {
                if (heartbeat == resp) {
                    return;
                }
                if (resp) {
                    setHeartbeat(true);
                } else {
                    setHeartbeat(false);
                }
            });
        }, HEART_BEAT_CHECK_1S);

        return () => {
            clearInterval(intervalID);
        }
    })


    return (
        <header className="text-gray-600 min-w-full h-min z-10">
            {heartbeat ? null : <HeadAlert message={HEART_BEAT_ALERT} />}
            <div className="flex flex-nowrap mx-auto p-1 md:p-5 flex-row items-center">
                <Link href={"/"} className="flex title-font font-medium items-center text-gray-900 hover:text-gray-600">
                    <img src="/icons/app_icon.svg" className="w-8 h-8 md:w-10 md:h-10 text-white p-2 rounded-full border-2 border-black" />
                    <span className="ml-3 text-sm md:text-xl text-nowrap">{PROJ_NAME}</span>
                </Link>
                <div className="mr-auto ml-2 md:ml-4 pl-2 md:pl-4 border-l border-gray-400">
                    <WindowMenu />
                </div>
                {/* <div className="visible md:invisible">
                    <PhoneMenu />
                </div> */}
                <div className="invisible md:visible">
                    <Github />
                </div>
            </div>
        </header>
    );
}