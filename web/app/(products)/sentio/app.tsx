'use client'

import { useEffect, useState } from "react";
import { Live2d } from './components/live2d';
import ChatBot from './components/chatbot';
import { Header } from './components/header';
import { useAppConfig } from "./hooks/appConfig";
import { Spinner } from "@heroui/react";


export default function App() {
    const { setAppConfig } = useAppConfig();
    const [ isLoading, setIsLoading ] = useState(true);
    
    // 初始化应用
    useEffect(() => {
        setAppConfig(null);
        setIsLoading(false);
    }, [])

    return (
        <div className='w-full h-full'>
            {
                isLoading ?
                <Spinner className="w-screen h-screen z-10" color="secondary" size="lg" variant="wave" />
                :
                <div className='flex flex-col w-full h-full'>
                    <Header />
                    <ChatBot />
                </div>
            }
            <Live2d />
        </div>
    );
}