import React, { useEffect } from 'react';
import { LAppDelegate } from '../../live2d/lappdelegate';
import * as LAppDefine from '../../live2d/lappdefine';

export function Live2dComponent () {
    const handleLoad = () => {
        // create the application instance
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
        LAppDelegate.releaseInstance();
      }
    useEffect(() => {
        handleLoad()
        // window.addEventListener('load', handleLoad);
        window.addEventListener('resize', handleResize);
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
          // window.removeEventListener('load', handleLoad);
          window.removeEventListener('resize', handleResize);
          window.removeEventListener('beforeunload', handleBeforeUnload);
        }
      }, []);

    return (
        <div>
            <canvas id="bodyCanvas"/>
        </div>
    )
}