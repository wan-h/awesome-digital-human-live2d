// @ts-ignore
import lamejs from 'lamejs'
// @ts-ignore
import MPEGMode from 'lamejs/src/js/MPEGMode'
// @ts-ignore
import Lame from 'lamejs/src/js/Lame'
// @ts-ignore
import BitStream from 'lamejs/src/js/BitStream'

if (globalThis) {
  (globalThis as any).MPEGMode = MPEGMode
    ; (globalThis as any).Lame = Lame
    ; (globalThis as any).BitStream = BitStream
}

export const convertToMp3 = (recorder: any) => {
  const wav = lamejs.WavHeader.readHeader(recorder.getWAV())
  const { channels, sampleRate } = wav
  const mp3enc = new lamejs.Mp3Encoder(channels, sampleRate, 128)
  const result = recorder.getChannelData()
  const buffer = []

  const leftData = result.left && new Int16Array(result.left.buffer, 0, result.left.byteLength / 2)
  const rightData = result.right && new Int16Array(result.right.buffer, 0, result.right.byteLength / 2)
  const remaining = leftData.length + (rightData ? rightData.length : 0)

  const maxSamples = 1152
  for (let i = 0; i < remaining; i += maxSamples) {
    const left = leftData.subarray(i, i + maxSamples)
    let right = null
    let mp3buf = null

    if (channels === 2) {
      right = rightData.subarray(i, i + maxSamples)
      mp3buf = mp3enc.encodeBuffer(left, right)
    }
    else {
      mp3buf = mp3enc.encodeBuffer(left)
    }

    if (mp3buf.length > 0)
      buffer.push(mp3buf)
  }

  const enc = mp3enc.flush()

  if (enc.length > 0)
    buffer.push(enc)

  return new Blob(buffer, { type: 'audio/mp3' })
}

export const convertFloat32ArrayToMp3 = (audio: Float32Array) => {
  // Float32Array of audio samples at sample rate 16000
  const floatArray2Int16 = (floatBuffer: Float32Array) => {
    const int16Buffer = new Int16Array(floatBuffer.length);
    for (let i = 0, len = floatBuffer.length; i < len; i++) {
      if (floatBuffer[i] < 0) {
        int16Buffer[i] = 0x8000 * floatBuffer[i];
      } else {
        int16Buffer[i] = 0x7fff * floatBuffer[i];
      }
    }
    return int16Buffer;
  }
  const mergeArray = (list: Float32Array[]) => {
    const length = list.length * list[0].length;
    let data = new Float32Array(length);
    let offset = 0;
    for (let i = 0; i < list.length; i++) {
      data.set(list[i], offset);
      offset += list[i].length;
    }
    return data;
  }

  const encodeMono = (
    channels: number,
    sampleRate: number,
    samples: Int16Array
  ) => {
    const buffer: ArrayBuffer[] = [];
    const mp3enc: lamejs.Mp3Encoder = new lamejs.Mp3Encoder(
      channels,
      sampleRate,
      128
    );
    let remaining = samples.length;
    const maxSamples = 1152;

    for (let i = 0; remaining >= maxSamples; i += maxSamples) {
      const mono = samples.subarray(i, i + maxSamples);
      const mp3buf = mp3enc.encodeBuffer(mono);
      if (mp3buf.length > 0) {
        buffer.push(mp3buf);
      }
      remaining -= maxSamples;
    }

    const d = mp3enc.flush();
    if (d.length > 0) {
      buffer.push(d);
    }

    return new Blob(buffer, { type: 'audio/mp3' });
  }

  const int16Array = floatArray2Int16(audio);
  const mp3Blob = encodeMono(1, 16000, int16Array);
  return mp3Blob
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export const convertMp3ArrayBufferToWavArrayBuffer = async (mp3ArrayBuffer: ArrayBuffer): Promise<ArrayBuffer> => {
  const mp3Blob = new Blob([mp3ArrayBuffer], { type: 'audio/mp3' })
  const wavBlob = await convertMp3BlobToWavBlob(mp3Blob)
  return wavBlob.arrayBuffer()
}

export const convertMp3BlobToWavBlob = async (mp3Blob: Blob): Promise<Blob> => {
  // 将Blob对象转换为ArrayBuffer对象
  const arrayBuffer = await mp3Blob.arrayBuffer();

  // 创建AudioContext对象并解码音频数据
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // 获取音频数据的声道和采样率
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;

  // 获取音频数据的每个声道的数据
  const channelData = [];
  for (let i = 0; i < numberOfChannels; i++) {
    const data = audioBuffer.getChannelData(i);
    // 将Float32Array转换为Int16Array
    const int16Data = new Int16Array(data.length);
    for (let j = 0; j < data.length; j++) {
      int16Data[j] = Math.round(data[j] * 32767);
    }
    channelData.push(int16Data);
  }

  // 构造WAV文件头
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  // RIFF头
  writeString(view, 0, 'RIFF'); // RIFF标记
  view.setUint32(4, 36 + channelData[0].length * 2 * numberOfChannels, true); // 文件大小（不包括RIFF头）
  writeString(view, 8, 'WAVE'); // WAVE标记

  // 格式块
  writeString(view, 12, 'fmt '); // 格式块标记
  view.setUint32(16, 16, true); // 格式块大小
  view.setUint16(20, 1, true); // 格式类型（1表示PCM）
  view.setUint16(22, numberOfChannels, true); // 声道数
  view.setUint32(24, sampleRate, true); // 采样率
  view.setUint32(28, sampleRate * 2 * numberOfChannels, true); // 字节率
  view.setUint16(32, 2 * numberOfChannels, true); // 块对齐
  view.setUint16(34, 16, true); // 位深度

  // 数据块
  writeString(view, 36, 'data'); // 数据块标记
  view.setUint32(40, channelData[0].length * 2 * numberOfChannels, true); // 数据大小

  // 合并所有音频数据
  const wavData = new Uint8Array(wavHeader.byteLength + channelData[0].length * 2 * numberOfChannels);
  new Uint8Array(wavHeader).forEach((byte, index) => {
    wavData[index] = byte;
  });
  let offset = wavHeader.byteLength;
  for (let i = 0; i < channelData[0].length; i++) {
    for (let j = 0; j < numberOfChannels; j++) {
      wavData[offset++] = channelData[j][i] & 0xFF;
      wavData[offset++] = (channelData[j][i] >> 8) & 0xFF;
    }
  }

  // 创建wav格式的Blob对象
  const wavBlob = new Blob([wavData], { type: 'audio/wav' });

  return wavBlob;
}

export class AudioRecoder {
  private _sampleRate: number;
  private _channleCount: number;
  private _chunkSize: number;
  private _audioContext: AudioContext | null = null;
  private _mediaStream: MediaStream | null = null;
  private _audioWorkletNode: AudioWorkletNode | null = null;
  private _audioBuffer: number[] = [];
  private _onFloat32AudioChunk?: (chunk: Float32Array) => void;
  private _onUint8AudioChunk?: (chunk: Uint8Array) => void;

  constructor(
    sampleRate = 16000, 
    channleCount = 1, 
    chunkSize = 16000 / 1000 * 60 * 2, // 60ms数据(字节数, 一个frame 16位, 2个byte)
    onUint8AudioChunk?: (chunk: Uint8Array) => void,
    onFloat32AudioChunk?: (chunk: Float32Array) => void
  ) {
    this._sampleRate = sampleRate;
    this._channleCount = channleCount;
    this._chunkSize = chunkSize;
    this._onFloat32AudioChunk = onFloat32AudioChunk;
    this._onUint8AudioChunk = onUint8AudioChunk;
  }

  async start() {
    // 获取麦克风权限
    this._mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: this._sampleRate,
        channelCount: this._channleCount,
        // 回声消除
        echoCancellation: true,
        // 噪声抑制
        noiseSuppression: true,
      }
    });
    // 创建AudioContext对象
    this._audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: this._sampleRate
    });
    // 创建AudioWorkletNode对象
    await this._audioContext.audioWorklet.addModule(
      // URL.createObjectURL(new Blob([
      //   `
      //   class AudioProcessor extends AudioWorkletProcessor {
      //       process(inputs, outputs, parameters) {
      //           const input = inputs[0];
      //           if (input && input[0]) {
      //               // 将Float32Array转换为Int16Array
      //               const float32Data = input[0];
      //               const int16Data = new Int16Array(float32Data.length);
      //               for (let i = 0; i < float32Data.length; i++) {
      //                   const sample = Math.max(-1, Math.min(1, float32Data[i]));
      //                   int16Data[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      //               }
      //               this.port.postMessage(int16Data);
      //           }
      //           return true;
      //       }
      //   }
      //   registerProcessor('audio-processor', AudioProcessor);
      //   `
      // ], { type: 'application/javascript' }))

      URL.createObjectURL(new Blob([
        `
        class AudioProcessor extends AudioWorkletProcessor {
            process(inputs, outputs, parameters) {
                const input = inputs[0];
                if (input && input[0]) {
                    const float32Data = input[0];
                    this.port.postMessage(float32Data);
                }
                return true;
            }
        }
        registerProcessor('audio-processor', AudioProcessor);
        `
      ], { type: 'application/javascript' }))
    );
    const source = this._audioContext.createMediaStreamSource(this._mediaStream);
    this._audioWorkletNode = new AudioWorkletNode(this._audioContext, 'audio-processor');
    this._audioWorkletNode.port.onmessage = (event) => {
      this.processAudioData(event.data);
    }
    source.connect(this._audioWorkletNode);
  }

  stop(): void {
    if (this._audioWorkletNode) {
        this._audioWorkletNode.disconnect();
        this._audioWorkletNode = null;
    }

    if (this._mediaStream) {
        this._mediaStream.getTracks().forEach(track => track.stop());
        this._mediaStream = null;
    }

    if (this._audioContext) {
        this._audioContext.close();
        this._audioContext = null;
    }
  }

  private processAudioData(audioData: Float32Array): void {
    if (this._onFloat32AudioChunk) {
      this._onFloat32AudioChunk(audioData);
    }
    // float32转int16
    const int16Data = new Int16Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
        const sample = Math.max(-1, Math.min(1, audioData[i]));
        int16Data[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    // 将Int16Array转换为字节数组
    const bytes = new Uint8Array(int16Data.length * 2);
    for (let i = 0; i < int16Data.length; i++) {
        const sample = int16Data[i];
        bytes[i * 2] = sample & 0xFF;         // 低字节
        bytes[i * 2 + 1] = (sample >> 8) & 0xFF; // 高字节
    }

    // 添加到缓冲区
    for (let i = 0; i < bytes.length; i++) {
        this._audioBuffer.push(bytes[i]);
    }

    // 如果缓冲区达到目标大小，发送音频块
    while (this._audioBuffer.length >= this._chunkSize) {
        const chunk = new Uint8Array(this._audioBuffer.splice(0, this._chunkSize));
        if (this._onUint8AudioChunk) {
            this._onUint8AudioChunk(chunk);
        }
    }
  }
}