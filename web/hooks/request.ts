import { useRef, useEffect } from "react";

export function useRequestController() {
    const controller = useRef<AbortController | null>(null);

    const cq = () => {
        if (controller.current) {
            controller.current.abort();
        }
        controller.current = new AbortController();
        return controller.current.signal;
    }

    const cr = () => {
        if (controller.current) {
            controller.current = null; 
        }
    }
    
    useEffect(() => {
        // 清理函数，组件卸载时取消请求
        return () => {
            if (controller.current) {
                controller.current.abort();
                controller.current = null;
            }
        };
    }, []);

    return {
        cq, cr
    }
}