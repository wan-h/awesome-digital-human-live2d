'use client'

import React, { useEffect, useRef } from 'react';
import { LAppDelegate } from '@/app/lib/live2d/lappdelegate';
import * as LAppDefine from '@/app/lib/live2d/lappdefine';
import { CharacterManager } from "@/app/lib/character"
import { useCharacterStore, useBackgroundStore } from "@/app/lib/store";

export default function Live2d() {
    const { character } = useCharacterStore();
    const { background } = useBackgroundStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);
  
    if (canvasRef.current) {
        if (background != null) {
            canvasRef.current.style.backgroundImage = `url('/backgrounds/${background}.jpg')`;
        } else {
            // 去掉背景图
            canvasRef.current.style.backgroundImage = 'none';
        }
    }
    
    const handleLoad = () => {
        // create the application instance
        if (LAppDelegate.getInstance().initialize() == false) {
            return;
        }

        LAppDelegate.getInstance().run();
        CharacterManager.getInstance().setCharacter(character);

    }

    const handleResize = () => {
        if (LAppDefine.CanvasSize === 'auto') {
            LAppDelegate.getInstance().onResize();
        }
    }

    const handleBeforeUnload = () => {
        LAppDelegate.releaseInstance();
    }

    useEffect(() => {
        handleLoad()
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            handleBeforeUnload();
        }
    }, []);

    return (
        <canvas 
            id="bodyCanvas"
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full bg-center bg-cover z-0"
        />
    )
}