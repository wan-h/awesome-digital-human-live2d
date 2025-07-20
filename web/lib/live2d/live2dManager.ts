import { LAppDelegate } from '@/lib/live2d/src/lappdelegate';
import { ResourceModel } from '@/lib/protocol';

export class Live2dManager {
    // 单例
    public static getInstance(): Live2dManager {
        if (! this._instance) {
            this._instance = new Live2dManager();
        }

        return this._instance;
    }

    public setReady(ready: boolean) {
      this._ready = ready;
    }

    public isReady(): boolean {
      return this._ready;
    }

    public changeCharacter(character: ResourceModel | null) {
      // _subdelegates中只有一个画布, 所以设置第一个即可
      this._ready = false;
      LAppDelegate.getInstance().changeCharacter(character)
    }

    public setLipFactor(weight: number): void {
      this._lipFactor = weight;
    }

    public getLipFactor(): number {
      return this._lipFactor;
    }

    public pushAudioQueue(audioData: ArrayBuffer): void {
      this._ttsQueue.push(audioData);
      // 传统TTS模式下自动播放音频块
      // 流式TTS会直接调用playAudioChunk方法
      if (this._ttsQueue.length === 1 && !this._audioIsPlaying) {
        this.playNextAudioChunk();
      }
    }

    public popAudioQueue(): ArrayBuffer | null {
      if (this._ttsQueue.length > 0) {
        const audioData = this._ttsQueue.shift();
        return audioData;
      } else {
        return null;
      }
    }

    public clearAudioQueue(): void {
      this._ttsQueue = [];
      this._nextStartTime = 0;
    }

    // 实时播放音频块（参考streaming_tts_test.html实现）
    public async playAudioChunk(audioData: Uint8Array): Promise<void> {
      try {
        // 确保AudioContext处于运行状态
        if (this._audioContext.state === 'suspended') {
          await this._audioContext.resume();
        }

        // 处理Float32格式的音频数据（后端已转换）
        const sampleRate = 16000; // 根据TTS引擎设置
        const channels = 1;
        const samples = audioData.length / 4; // Float32每个样本4字节

        if (samples <= 0) {
          console.warn('音频数据为空，跳过播放');
          return;
        }

        const audioBuffer = this._audioContext.createBuffer(channels, samples, sampleRate);
        const channelData = audioBuffer.getChannelData(0);

        // 直接使用Float32数据（后端已转换）
        const float32Array = new Float32Array(audioData.buffer, audioData.byteOffset, samples);
        for (let i = 0; i < samples; i++) {
          channelData[i] = float32Array[i];
        }

        // 创建音频源并播放
        const source = this._audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this._audioContext.destination);

        // 计算播放时间
        const startTime = Math.max(this._audioContext.currentTime, this._nextStartTime);
        source.start(startTime);

        // 更新下次播放时间
        this._nextStartTime = startTime + audioBuffer.duration;

        console.log(`✓ 音频块已调度播放: ${audioData.length} 字节, 时长: ${audioBuffer.duration.toFixed(3)}秒`);

      } catch (error) {
        console.error('音频播放错误:', error);
      }
    }

    // 播放下一个音频块
    private async playNextAudioChunk(): Promise<void> {
      const audioData = this.popAudioQueue();
      if (audioData) {
        const uint8Array = new Uint8Array(audioData);
        await this.playAudioChunk(uint8Array);
      }
    }

    public playAudio(): ArrayBuffer | null {
      if (this._audioIsPlaying) return null; // 如果正在播放则返回
      const audioData = this.popAudioQueue();
      if (audioData == null) return null; // 没有音频数据则返回
      this._audioIsPlaying = true;
      // 播放音频
      const playAudioBuffer = (buffer: AudioBuffer) => {
        var source = this._audioContext.createBufferSource();
        source.buffer = buffer;
        
        source.connect(this._audioContext.destination);
        // 监听音频播放完毕事件
        source.onended = () => {
          this._audioIsPlaying = false;
        };
        source.start();
        this._audioSource = source;
      }
      // 创建一个新的 ArrayBuffer 并复制数据, 防止原始数据被decodeAudioData释放
      const newAudioData = audioData.slice(0);
      this._audioContext.decodeAudioData(newAudioData).then(
        buffer => {
          playAudioBuffer(buffer);
        }
      );
      return audioData;
    }

    public stopAudio(): void {
      this.clearAudioQueue();
      if (this._audioSource) {
        this._audioSource.stop();
        this._audioSource = null;
      }
      this._audioIsPlaying = false;
    }

    public isAudioPlaying(): boolean {
      return this._audioIsPlaying;
    }

    constructor() {
      this._audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this._audioIsPlaying = false;
      this._audioSource = null;
      this._lipFactor = 1.0;
      this._ready = false;
      this._nextStartTime = 0;
    }

    private static _instance: Live2dManager;
    private _ttsQueue: ArrayBuffer[] = [];
    private _audioContext: AudioContext;
    private _audioIsPlaying: boolean;
    private _audioSource: AudioBufferSourceNode | null;
    private _lipFactor: number;
    private _ready: boolean;
    private _nextStartTime: number;
  }