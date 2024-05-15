import * as API from './api';
import { LAppLive2DManager } from '../live2d/lapplive2dmanager';


export class Comm {
    // 单例
    public static getInstance(): Comm {
        if (! this._instance) {
            this._instance = new Comm();
        }

        return this._instance;
    }

    public async getHeartbeat(): Promise<boolean>{
      return API.common_heatbeat_api().then(response => {
        if (response.data == 1) {
          return true;
        } else {
          return false;
        }
      }).catch(error => {
        console.error(error);
        return false;
      })
    }

    public async chat(mode: string, text: string, character: string): Promise<string> {
      return API.agent_infer_api(mode, text, character)
        .then(response => {
            if (response.format != "wav") {
              console.error(`Only support wav audio data but get ${response.format}`)
              return "抱歉，内部接口错误，我无法回答您的问题。";
            }
            // 解码音频数据(wav base64encode string -> ArrayBuffer)
            const base64ToArrayBuffer = (base64String: string) => {
              const binaryString = window.atob(base64String);  
              const len = binaryString.length;  
              const bytes = new Uint8Array(len);  
              for (let i = 0; i < len; i++) {  
                  bytes[i] = binaryString.charCodeAt(i);  
              }  
              return bytes.buffer;  
            }
            this._talkData = base64ToArrayBuffer(response.data);
            return response.desc;
        })
        .catch(error => {
          console.error(error);
          return "抱歉，内部错误，我无法回答您的问题。";
        })
    }

    public getTalkData(): ArrayBuffer | null {
      let data = null
      if (this._talkData) {
        data =  this._talkData;
        this._talkData = null;
      }
      return data;
    }

    public getLive2dPortraits(): {[key: string]: string[]} {
      return LAppLive2DManager.getInstance().getPortraits();
    }

    public setLive2dCharacter(profession: string, character: string): void {
      LAppLive2DManager.getInstance().changeCharacter(profession, character);
    }

    private static _instance: Comm;
    private _talkData: any = null;
  }