'use client'

import React, { useEffect, useState } from 'react';
import { LAppDelegate } from '@/lib/live2d/src/lappdelegate';
import * as LAppDefine from '@/lib/live2d/src/lappdefine';
import { Spinner } from '@heroui/react';
import { useSentioBackgroundStore } from "@/lib/store/sentio";
import { useTranslations } from 'next-intl';
import { useLive2D } from '../hooks/live2d';

export function Live2d() {
    const t = useTranslations('Products.sentio');
    const { ready } = useLive2D();
    const { background } = useSentioBackgroundStore();

    const handleLoad = () => {
        if (LAppDelegate.getInstance().initialize() == false) {
            return;
        }
        LAppDelegate.getInstance().run();
    }

    const handleResize = () => {
        if (LAppDefine.CanvasSize === 'auto') {
            LAppDelegate.getInstance().onResize();
        }
    }

    const handleBeforeUnload = () => {
        // 释放实例
        LAppDelegate.releaseInstance();
    }

    // useEffect(() => {
    //     // 切换背景图
    //     if (canvasRef.current) {
    //         if (background) {
    //             canvasRef.current.style.backgroundImage = `url('${background.link}')`;
    //         } else {
    //             canvasRef.current.style.backgroundImage = 'none';
    //         }
    //     }
    // }, [background])

    useEffect(() => {
        handleLoad();
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            handleBeforeUnload();
        }
    }, []);

    return (
        <div className='absolute top-0 left-0 w-full h-full z-0'>
            {
                background && (background.link.endsWith('.mp4') ? 
                <video 
                    className='absolute top-0 left-0 w-full h-full object-cover z-[-1]' 
                    autoPlay 
                    muted 
                    loop
                    src={background.link}
                    style={{ pointerEvents: 'none' }}
                />
                :
                <img 
                    src={background.link}
                    alt="Background Image"
                    className='absolute top-0 left-0 w-full h-full object-cover z-[-1]'
                />
                )
            }
            {
                !ready &&  <div className='absolute top-0 left-0 w-full h-full flex flex-row gap-1 items-center justify-center z-50'>
                    <p className='text-xl font-bold'>{t('loading')}</p>
                    <Spinner color='warning' variant="dots" size='lg'/>
                </div>
            }
            <canvas
                id="live2dCanvas"
                // ref={canvasRef}
                className='w-full h-full bg-center bg-cover'
            />
        </div>   
    )
}