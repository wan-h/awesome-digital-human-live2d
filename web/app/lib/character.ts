import { LAppDelegate } from '@/app/lib/live2d/lappdelegate';

export class CharacterManager {
    // 单例
    public static getInstance(): CharacterManager {
        if (! this._instance) {
            this._instance = new CharacterManager();
        }

        return this._instance;
    }

    public getLive2dPortraits(): {[key: string]: string} {
      return LAppDelegate.getInstance().getPortraits();
    }

    public getCharacter(): string {
      return LAppDelegate.getInstance().getCharacter();
    }

    public setCharacter(character: string): void {
      LAppDelegate.getInstance().changeCharacter(character);
    }

    public getBackImages(): {[key: string]: string} {
      return LAppDelegate.getInstance().getBackImages();
    }

    // public getBackground(): string {
    //   return LAppDelegate.getInstance().getBackground();
    // }

    // public setBackground(background: string | null): void {
    //   LAppDelegate.getInstance().changeBackground(background);
    // }

    public pushAudioQueue(audioData: ArrayBuffer): void {
      this._ttsQueue.push(audioData);
    }

    public popAudioQueue(): ArrayBuffer | null {
      if (this._ttsQueue.length > 0) {
        const audioData = this._ttsQueue.shift();
        return audioData;
      } else {
        return null;
      }
    }

    private static _instance: CharacterManager;
    private _ttsQueue: ArrayBuffer[] = [];
  }