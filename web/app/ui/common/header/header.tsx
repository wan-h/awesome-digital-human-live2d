'use client'

import { useState, useEffect } from 'react'
import { useHeartbeatStore } from '@/app/lib/store'
import { HeadAlert } from '@/app/ui/common/alert'
import {
  PROJ_NAME,
  HEART_BEAT_ALERT,
  HEART_BEAT_CHECK_1S,
} from '@/app/lib/constants'
import { WindowMenu } from './menu'
import Github from './github'
import Link from 'next/link'
import useWebSocket, { ReadyState } from 'react-use-websocket'
import { get_heatbeat_wss } from '@/app/lib/api'
import {
  Navbar,
  NavbarContent,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
} from '@nextui-org/react'
import Gallery from '../../home/gallery'
import Settings from '../../home/settings'

export default function Header() {
  const { heartbeat, setHeartbeat } = useHeartbeatStore()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const { readyState } = useWebSocket(get_heatbeat_wss(), {
    shouldReconnect: () => true,
    heartbeat: {
      message: 'ping',
      returnMessage: 'pong',
      timeout: 3000, // 3s
      interval: HEART_BEAT_CHECK_1S,
    },
  })

  useEffect(() => {
    if (readyState === ReadyState.OPEN) {
      setHeartbeat(true)
    } else {
      setHeartbeat(false)
    }
  }, [readyState])

  return (
    <>
      {heartbeat ? null : <HeadAlert message={HEART_BEAT_ALERT} />}
      {/* 'backdrop-blur-xl backdrop-saturate-150' */}

      <div className="flex text-gray-600 flex-nowrap w-full mx-auto p-1 md:p-5 flex-row justify-between items-center">
        <Navbar
          className={`flex justify-between ${
            isMenuOpen
              ? 'backdrop-blur-xl backdrop-saturate-150'
              : 'md:!backdrop-filter-none bg-transparent !backdrop-blur-none'
          } md:w-2/5 `}
        >
          <NavbarContent>
            <Link
              href={'/'}
              className="flex title-font font-medium items-center text-gray-900 hover:text-gray-600 min-w-[290px]"
            >
              <img
                src="/icons/app_icon.svg"
                className="w-8 h-8 md:w-10 md:h-10 text-white p-2 rounded-full border-2 border-black"
              />
              <span className="ml-3 text-sm md:text-xl text-nowrap">
                {PROJ_NAME}
              </span>
            </Link>

            <div className="hidden md:block pl-4 border-l">
              <WindowMenu />
            </div>
          </NavbarContent>

          <NavbarContent className="md:hidden" justify="end">
            <NavbarMenuToggle
              onClick={() => {
                setIsMenuOpen(!isMenuOpen)
              }}
            />
          </NavbarContent>

          <NavbarMenu className="mt-10">
            <NavbarMenuItem>
              <Gallery />
            </NavbarMenuItem>
            <NavbarMenuItem>
              <Settings />
            </NavbarMenuItem>
            <NavbarMenuItem>
              <Link href="https://github.com/wan-h/awesome-digital-human-live2d">
                GitHub
              </Link>
            </NavbarMenuItem>
          </NavbarMenu>
        </Navbar>

        <div className="hidden md:block">
          <Github />
        </div>
      </div>
    </>
  )
}
