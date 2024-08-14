/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { LAppPal } from './lapppal';

export let s_instance: LAppWavFileHandler = null;

export class LAppWavFileHandler {
  /**
   * 返回一个类的实例
   * 如果未生成实例，则在内部生成实例
   *
   * @return 类实例
   */
  public static getInstance(): LAppWavFileHandler {
    if (s_instance == null) {
      s_instance = new LAppWavFileHandler();
    }

    return s_instance;
  }

  /**
   * 释放一个类的实例（单个
   */
  public static releaseInstance(): void {
    if (s_instance != null) {
      s_instance = void 0;
    }

    s_instance = null;
  }

  public update(deltaTimeSeconds: number) {
    let goalOffset: number;
    let rms: number;

    // 数据加载前/文件结束时不更新
    if (
      this._pcmData == null ||
      this._sampleOffset >= this._wavFileInfo._samplesPerChannel
    ) {
      this._lastRms = 0.0;
      return false;
    }

    // 保持经过时间后状态
    this._userTimeSeconds += deltaTimeSeconds;
    goalOffset = Math.floor(
      this._userTimeSeconds * this._wavFileInfo._samplingRate
    );
    if (goalOffset > this._wavFileInfo._samplesPerChannel) {
      goalOffset = this._wavFileInfo._samplesPerChannel;
    }

    // RMS计测
    rms = 0.0;
    for (
      let channelCount = 0;
      channelCount < this._wavFileInfo._numberOfChannels;
      channelCount++
    ) {
      for (
        let sampleCount = this._sampleOffset;
        sampleCount < goalOffset;
        sampleCount++
      ) {
        const pcm = this._pcmData[channelCount][sampleCount];
        rms += pcm * pcm;
      }
    }
    rms = Math.sqrt(
      rms /
        (this._wavFileInfo._numberOfChannels *
          (goalOffset - this._sampleOffset))
    );

    this._lastRms = rms;
    this._sampleOffset = goalOffset;
    return true;
  }

  public start(filePath: string | ArrayBuffer): void {
    // 初始化采样位参照位置
    this._sampleOffset = 0;
    this._userTimeSeconds = 0.0;

    // 重置RMS值
    this._lastRms = 0.0;

    if (!this.loadWavFile(filePath)) {
      return;
    }
  }

  public getRms(): number {
    return this._lastRms;
  }

  public loadWavFile(fileData: string | ArrayBuffer): boolean {
    let ret = false;

    if (this._pcmData != null) {
      this.releasePcmData();
    }

    // 文件加载
    const asyncFileLoad = async () => {
      if (fileData instanceof ArrayBuffer) {
        return fileData;
      } else {
        let data = await fetch(fileData);
        return data.arrayBuffer();
      }
    };

    const asyncWavFileManager = (async () => {
      this._byteReader._fileByte = await asyncFileLoad();
      this._byteReader._fileDataView = new DataView(this._byteReader._fileByte);
      this._byteReader._fileSize = this._byteReader._fileByte.byteLength;
      this._byteReader._readOffset = 0;
      // 如果文件加载失败，或者文件大小不足以包含第一个签名“RIFF”，则失败
      if (
        this._byteReader._fileByte == null ||
        this._byteReader._fileSize < 4
      ) {
        return false;
      }

      // 文件名
      // this._wavFileInfo._fileName = "";

      try {
        // 签名“RIFF”
        if (!this._byteReader.getCheckSignature('RIFF')) {
          ret = false;
          throw new Error('Cannot find Signeture "RIFF".');
        }
        // 文件大小-8（跳过）
        this._byteReader.get32LittleEndian();
        // 签名“WAVE”
        if (!this._byteReader.getCheckSignature('WAVE')) {
          ret = false;
          throw new Error('Cannot find Signeture "WAVE".');
        }
        // 签名“fmt”
        if (!this._byteReader.getCheckSignature('fmt ')) {
          ret = false;
          throw new Error('Cannot find Signeture "fmt".');
        }
        // fmt信息块大小
        const fmtChunkSize = this._byteReader.get32LittleEndian();
        // 格式ID除1（线性PCM）以外不接受
        if (this._byteReader.get16LittleEndian() != 1) {
          ret = false;
          throw new Error('File is not linear PCM.');
        }
        // 频道数
        this._wavFileInfo._numberOfChannels =
        this._byteReader.get16LittleEndian();
        // 取样速率
        this._wavFileInfo._samplingRate = this._byteReader.get32LittleEndian();
        // 数据速度[byte/sec]（跳过）
        this._byteReader.get32LittleEndian();
        // 块大小（跳过）
        this._byteReader.get16LittleEndian();
        // 量化位数
        this._wavFileInfo._bitsPerSample = this._byteReader.get16LittleEndian();
        // 跳过fmt信息块的扩展部分
        if (fmtChunkSize > 16) {
          this._byteReader._readOffset += fmtChunkSize - 16;
        }
        // 直到“data”信息块出现
        while (
          !this._byteReader.getCheckSignature('data') &&
          this._byteReader._readOffset < this._byteReader._fileSize
        ) {
          this._byteReader._readOffset +=
            this._byteReader.get32LittleEndian() + 4;
        }
        // 文件中未出现“data”信息块
        if (this._byteReader._readOffset >= this._byteReader._fileSize) {
          ret = false;
          throw new Error('Cannot find "data" Chunk.');
        }
        // 样本数
        {
          const dataChunkSize = this._byteReader.get32LittleEndian();
          this._wavFileInfo._samplesPerChannel =
            (dataChunkSize * 8) /
            (this._wavFileInfo._bitsPerSample *
              this._wavFileInfo._numberOfChannels);
        }
        // 领域确保
        this._pcmData = new Array(this._wavFileInfo._numberOfChannels);
        for (
          let channelCount = 0;
          channelCount < this._wavFileInfo._numberOfChannels;
          channelCount++
        ) {
          this._pcmData[channelCount] = new Float32Array(
            this._wavFileInfo._samplesPerChannel
          );
        }
        // 波形数据取得
        for (
          let sampleCount = 0;
          sampleCount < this._wavFileInfo._samplesPerChannel;
          sampleCount++
        ) {
          for (
            let channelCount = 0;
            channelCount < this._wavFileInfo._numberOfChannels;
            channelCount++
          ) {
            this._pcmData[channelCount][sampleCount] = this.getPcmSample();
          }
        }

        ret = true;
      } catch (e) {
        console.log(e);
      }

      // 播放音频
      const playAudioBuffer = (buffer: AudioBuffer) => {
        var source = this._audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this._audioContext.destination);
        source.start();
      }
      this._audioContext.decodeAudioData(this._byteReader._fileByte).then(
        buffer => {
          playAudioBuffer(buffer);
        }
      )
    })();

    return ret;
  }

  public getPcmSample(): number {
    let pcm32;

    // 扩展到32位宽度，然后舍入到-1到1的范围
    switch (this._wavFileInfo._bitsPerSample) {
      case 8:
        pcm32 = this._byteReader.get8() - 128;
        pcm32 <<= 24;
        break;
      case 16:
        pcm32 = this._byteReader.get16LittleEndian() << 16;
        break;
      case 24:
        pcm32 = this._byteReader.get24LittleEndian() << 8;
        break;
      default:
        // 不支持的位宽度
        pcm32 = 0;
        break;
    }

    return pcm32 / 2147483647; //Number.MAX_VALUE;
  }

  public releasePcmData(): void {
    for (
      let channelCount = 0;
      channelCount < this._wavFileInfo._numberOfChannels;
      channelCount++
    ) {
      delete this._pcmData[channelCount];
    }
    delete this._pcmData;
    this._pcmData = null;
  }

  constructor() {
    this._pcmData = null;
    this._userTimeSeconds = 0.0;
    this._lastRms = 0.0;
    this._sampleOffset = 0.0;
    this._wavFileInfo = new WavFileInfo();
    this._byteReader = new ByteReader();
    this._audioContext = new window.AudioContext();
  }

  _pcmData: Array<Float32Array>;
  _userTimeSeconds: number;
  _lastRms: number;
  _sampleOffset: number;
  _wavFileInfo: WavFileInfo;
  _byteReader: ByteReader;
  _loadFiletoBytes = (arrayBuffer: ArrayBuffer, length: number): void => {
    this._byteReader._fileByte = arrayBuffer;
    this._byteReader._fileDataView = new DataView(this._byteReader._fileByte);
    this._byteReader._fileSize = length;
  };
  _audioContext: AudioContext;
}

export class WavFileInfo {
  constructor() {
    this._fileName = '';
    this._numberOfChannels = 0;
    this._bitsPerSample = 0;
    this._samplingRate = 0;
    this._samplesPerChannel = 0;
  }

  _fileName: string; ///< 文件名
  _numberOfChannels: number; ///< 频道数
  _bitsPerSample: number; ///< 每采样位数
  _samplingRate: number; ///< 取样速率
  _samplesPerChannel: number; ///< 每个通道的总采样数
}

export class ByteReader {
  constructor() {
    this._fileByte = null;
    this._fileDataView = null;
    this._fileSize = 0;
    this._readOffset = 0;
  }

  /**
   * @brief 8位读取
   * @return Csm::csmUint8 读取的8位值
   */
  public get8(): number {
    const ret = this._fileDataView.getUint8(this._readOffset);
    this._readOffset++;
    return ret;
  }

  /**
   * @brief 16位读取（小端节序）
   * @return Csm::csmUint16 读取的16位值
   */
  public get16LittleEndian(): number {
    const ret =
      (this._fileDataView.getUint8(this._readOffset + 1) << 8) |
      this._fileDataView.getUint8(this._readOffset);
    this._readOffset += 2;
    return ret;
  }

  /**
   * @brief 24位读取（小端节序）
   * @return Csm::csmUint32 读取的24位值（设置为低位24位）
   */
  public get24LittleEndian(): number {
    const ret =
      (this._fileDataView.getUint8(this._readOffset + 2) << 16) |
      (this._fileDataView.getUint8(this._readOffset + 1) << 8) |
      this._fileDataView.getUint8(this._readOffset);
    this._readOffset += 3;
    return ret;
  }

  /**
   * @brief 32位读取（小端节序）
   * @return Csm::csmUint32 读取的32位值
   */
  public get32LittleEndian(): number {
    const ret =
      (this._fileDataView.getUint8(this._readOffset + 3) << 24) |
      (this._fileDataView.getUint8(this._readOffset + 2) << 16) |
      (this._fileDataView.getUint8(this._readOffset + 1) << 8) |
      this._fileDataView.getUint8(this._readOffset);
    this._readOffset += 4;
    return ret;
  }

  /**
   * @brief 获取签名并检查与引用字符串的匹配
   * @param[in] reference 要检查的签名字符串
   * @retval  true    一致
   * @retval  false   不一致
   */
  public getCheckSignature(reference: string): boolean {
    const getSignature: Uint8Array = new Uint8Array(4);
    const referenceString: Uint8Array = new TextEncoder().encode(reference);
    if (reference.length != 4) {
      return false;
    }
    for (let signatureOffset = 0; signatureOffset < 4; signatureOffset++) {
      getSignature[signatureOffset] = this.get8();
    }
    return (
      getSignature[0] == referenceString[0] &&
      getSignature[1] == referenceString[1] &&
      getSignature[2] == referenceString[2] &&
      getSignature[3] == referenceString[3]
    );
  }

  _fileByte: ArrayBuffer; ///< 加载文件的字节列
  _fileDataView: DataView;
  _fileSize: number; ///< 文件大小
  _readOffset: number; ///< 文件引用位置
}
