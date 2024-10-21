/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import 'whatwg-fetch';

import { CubismDefaultParameterId } from '@live2dFramework/cubismdefaultparameterid';
import { CubismModelSettingJson } from '@live2dFramework/cubismmodelsettingjson';
import {
  BreathParameterData,
  CubismBreath
} from '@live2dFramework/effect/cubismbreath';
import { CubismEyeBlink } from '@live2dFramework/effect/cubismeyeblink';
import { ICubismModelSetting } from '@live2dFramework/icubismmodelsetting';
import { CubismIdHandle } from '@live2dFramework/id/cubismid';
import { CubismFramework } from '@live2dFramework/live2dcubismframework';
import { CubismMatrix44 } from '@live2dFramework/math/cubismmatrix44';
import { CubismUserModel } from '@live2dFramework/model/cubismusermodel';
import {
  ACubismMotion,
  FinishedMotionCallback
} from '@live2dFramework/motion/acubismmotion';
import { CubismMotion } from '@live2dFramework/motion/cubismmotion';
import {
  CubismMotionQueueEntryHandle,
  InvalidMotionQueueEntryHandleValue
} from '@live2dFramework/motion/cubismmotionqueuemanager';
import { csmMap } from '@live2dFramework/type/csmmap';
import { csmRect } from '@live2dFramework/type/csmrectf';
import { csmString } from '@live2dFramework/type/csmstring';
import { csmVector } from '@live2dFramework/type/csmvector';
import {
  CSM_ASSERT,
  CubismLogError,
  CubismLogInfo
} from '@live2dFramework/utils/cubismdebug';

import { CubismMoc } from '@live2dFramework/model/cubismmoc';

import * as LAppDefine from './lappdefine';
import { canvas, frameBuffer, gl, LAppDelegate } from './lappdelegate';
import { LAppPal } from './lapppal';
import { TextureInfo } from './lapptexturemanager';
import { LAppWavFileHandler } from './lappwavfilehandler';
import { CharacterManager } from '@/app/lib/character';

enum LoadStep {
  LoadAssets,
  LoadModel,
  WaitLoadModel,
  LoadExpression,
  WaitLoadExpression,
  LoadPhysics,
  WaitLoadPhysics,
  LoadPose,
  WaitLoadPose,
  SetupEyeBlink,
  SetupBreath,
  LoadUserData,
  WaitLoadUserData,
  SetupEyeBlinkIds,
  SetupLipSyncIds,
  SetupLayout,
  LoadMotion,
  WaitLoadMotion,
  CompleteInitialize,
  CompleteSetupModel,
  LoadTexture,
  WaitLoadTexture,
  CompleteSetup
}

/**
 * 实现用户可用的模型并
 * 执行模型的生成、功能组件生成、更新处理和渲染调用等操作
 */
export class LAppModel extends CubismUserModel {
  /**
   * 根据model3.json中配置的设置生成模型
   * @param dir
   * @param fileName
   */
  public loadAssets(dir: string, fileName: string): void {
    
    this._modelHomeDir = dir;
  
    fetch(`${this._modelHomeDir}${fileName}`)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => {
        const setting: ICubismModelSetting = new CubismModelSettingJson(
          arrayBuffer,
          arrayBuffer.byteLength
        );

        // 更新状态
        this._state = LoadStep.LoadModel;

        // 保存结果
        this.setupModel(setting);
    });
  }

  /**
   * 从model3.json生成模型。
   * 根据model3.json的描述,执行模型生成、运动、物理计算等组件生成
   *
   * @param setting ICubismModelSettingのインスタンス
   */
  private setupModel(setting: ICubismModelSetting): void {
    this._updating = true;
    this._initialized = false;

    this._modelSetting = setting;

    // CubismModel
    if (this._modelSetting.getModelFileName() != '') {
      // 获取模型文件地址 .moc3文件
      const modelFileName = this._modelSetting.getModelFileName();

      fetch(`${this._modelHomeDir}${modelFileName}`)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => {
          this.loadModel(arrayBuffer, this._mocConsistency);
          this._state = LoadStep.LoadExpression;

          // callback
          loadCubismExpression();
        });

      this._state = LoadStep.WaitLoadModel;
    } else {
      LAppPal.printMessage('Model data does not exist.');
    }

    // Expression
    const loadCubismExpression = (): void => {
      if (this._modelSetting.getExpressionCount() > 0) {
        const count: number = this._modelSetting.getExpressionCount();

        for (let i = 0; i < count; i++) {
          const expressionName = this._modelSetting.getExpressionName(i);
          const expressionFileName =
            this._modelSetting.getExpressionFileName(i);

          fetch(`${this._modelHomeDir}${expressionFileName}`)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => {
              const motion: ACubismMotion = this.loadExpression(
                arrayBuffer,
                arrayBuffer.byteLength,
                expressionName
              );

              if (this._expressions.getValue(expressionName) != null) {
                ACubismMotion.delete(
                  this._expressions.getValue(expressionName)
                );
                this._expressions.setValue(expressionName, null);
              }

              this._expressions.setValue(expressionName, motion);

              this._expressionCount++;

              if (this._expressionCount >= count) {
                this._state = LoadStep.LoadPhysics;

                // callback
                loadCubismPhysics();
              }
            });
        }
        this._state = LoadStep.WaitLoadExpression;
      } else {
        this._state = LoadStep.LoadPhysics;

        // callback
        loadCubismPhysics();
      }
    };

    // Physics
    const loadCubismPhysics = (): void => {
      if (this._modelSetting.getPhysicsFileName() != '') {
        const physicsFileName = this._modelSetting.getPhysicsFileName();

        fetch(`${this._modelHomeDir}${physicsFileName}`)
          .then(response => response.arrayBuffer())
          .then(arrayBuffer => {
            this.loadPhysics(arrayBuffer, arrayBuffer.byteLength);

            this._state = LoadStep.LoadPose;

            // callback
            loadCubismPose();
          });
        this._state = LoadStep.WaitLoadPhysics;
      } else {
        this._state = LoadStep.LoadPose;

        // callback
        loadCubismPose();
      }
    };

    // Pose
    const loadCubismPose = (): void => {
      if (this._modelSetting.getPoseFileName() != '') {
        const poseFileName = this._modelSetting.getPoseFileName();

        fetch(`${this._modelHomeDir}${poseFileName}`)
          .then(response => response.arrayBuffer())
          .then(arrayBuffer => {
            this.loadPose(arrayBuffer, arrayBuffer.byteLength);

            this._state = LoadStep.SetupEyeBlink;

            // callback
            setupEyeBlink();
          });
        this._state = LoadStep.WaitLoadPose;
      } else {
        this._state = LoadStep.SetupEyeBlink;

        // callback
        setupEyeBlink();
      }
    };

    // EyeBlink
    const setupEyeBlink = (): void => {
      if (this._modelSetting.getEyeBlinkParameterCount() > 0) {
        this._eyeBlink = CubismEyeBlink.create(this._modelSetting);
        this._state = LoadStep.SetupBreath;
      }

      // callback
      setupBreath();
    };

    // Breath
    const setupBreath = (): void => {
      this._breath = CubismBreath.create();

      const breathParameters: csmVector<BreathParameterData> = new csmVector();
      breathParameters.pushBack(
        new BreathParameterData(this._idParamAngleX, 0.0, 15.0, 6.5345, 0.5)
      );
      breathParameters.pushBack(
        new BreathParameterData(this._idParamAngleY, 0.0, 8.0, 3.5345, 0.5)
      );
      breathParameters.pushBack(
        new BreathParameterData(this._idParamAngleZ, 0.0, 10.0, 5.5345, 0.5)
      );
      breathParameters.pushBack(
        new BreathParameterData(this._idParamBodyAngleX, 0.0, 4.0, 15.5345, 0.5)
      );
      breathParameters.pushBack(
        new BreathParameterData(
          CubismFramework.getIdManager().getId(
            CubismDefaultParameterId.ParamBreath
          ),
          0.5,
          0.5,
          3.2345,
          1
        )
      );

      this._breath.setParameters(breathParameters);
      this._state = LoadStep.LoadUserData;

      // callback
      loadUserData();
    };

    // UserData
    const loadUserData = (): void => {
      if (this._modelSetting.getUserDataFile() != '') {
        const userDataFile = this._modelSetting.getUserDataFile();

        fetch(`${this._modelHomeDir}${userDataFile}`)
          .then(response => response.arrayBuffer())
          .then(arrayBuffer => {
            this.loadUserData(arrayBuffer, arrayBuffer.byteLength);

            this._state = LoadStep.SetupEyeBlinkIds;

            // callback
            setupEyeBlinkIds();
          });

        this._state = LoadStep.WaitLoadUserData;
      } else {
        this._state = LoadStep.SetupEyeBlinkIds;

        // callback
        setupEyeBlinkIds();
      }
    };

    // EyeBlinkIds
    const setupEyeBlinkIds = (): void => {
      const eyeBlinkIdCount: number =
        this._modelSetting.getEyeBlinkParameterCount();

      for (let i = 0; i < eyeBlinkIdCount; ++i) {
        this._eyeBlinkIds.pushBack(
          this._modelSetting.getEyeBlinkParameterId(i)
        );
      }

      this._state = LoadStep.SetupLipSyncIds;

      // callback
      setupLipSyncIds();
    };

    // LipSyncIds
    const setupLipSyncIds = (): void => {
      const lipSyncIdCount = this._modelSetting.getLipSyncParameterCount();

      for (let i = 0; i < lipSyncIdCount; ++i) {
        this._lipSyncIds.pushBack(this._modelSetting.getLipSyncParameterId(i));
      }
      this._state = LoadStep.SetupLayout;

      // callback
      setupLayout();
    };

    // Layout
    const setupLayout = (): void => {
      const layout: csmMap<string, number> = new csmMap<string, number>();

      if (this._modelSetting == null || this._modelMatrix == null) {
        CubismLogError('Failed to setupLayout().');
        return;
      }

      this._modelSetting.getLayoutMap(layout);
      this._modelMatrix.setupFromLayout(layout);
      this._state = LoadStep.LoadMotion;

      // callback
      loadCubismMotion();
    };

    // Motion
    const loadCubismMotion = (): void => {
      this._state = LoadStep.WaitLoadMotion;
      this._model.saveParameters();
      this._allMotionCount = 0;
      this._motionCount = 0;
      const group: string[] = [];

      const motionGroupCount: number = this._modelSetting.getMotionGroupCount();

      // 求动作总数
      for (let i = 0; i < motionGroupCount; i++) {
        group[i] = this._modelSetting.getMotionGroupName(i);
        this._allMotionCount += this._modelSetting.getMotionCount(group[i]);
      }

      // 导入动作
      for (let i = 0; i < motionGroupCount; i++) {
        this.preLoadMotionGroup(group[i]);
      }

      // 没有动作
      if (motionGroupCount == 0) {
        this._state = LoadStep.LoadTexture;

        // 停止所有动作
        this._motionManager.stopAllMotions();

        this._updating = false;
        this._initialized = true;

        this.createRenderer();
        this.setupTextures();
        this.getRenderer().startUp(gl);
      }
    };
  }

  /**
   * 将纹理加载到纹理单元
   */
  private setupTextures(): void {
    // 为了提高iPhone的阿尔法质量，Typescript采用了premultipliedAlpha
    const usePremultiply = true;

    if (this._state == LoadStep.LoadTexture) {
      // 用于纹理导入
      const textureCount: number = this._modelSetting.getTextureCount();

      for (
        let modelTextureNumber = 0;
        modelTextureNumber < textureCount;
        modelTextureNumber++
      ) {
        // 如果纹理名称为空字符，则跳过加载绑定过程
        if (this._modelSetting.getTextureFileName(modelTextureNumber) == '') {
          console.log('getTextureFileName null');
          continue;
        }

        // 将纹理加载到WebGL纹理单元
        let texturePath =
          this._modelSetting.getTextureFileName(modelTextureNumber);
        texturePath = this._modelHomeDir + texturePath;

        // 加载完成时调用的回调函数
        const onLoad = (textureInfo: TextureInfo): void => {
          this.getRenderer().bindTexture(modelTextureNumber, textureInfo.id);

          this._textureCount++;

          if (this._textureCount >= textureCount) {
            // 加载完成
            this._state = LoadStep.CompleteSetup;
          }
        };

        // 载入
        LAppDelegate.getInstance()
          .getTextureManager()
          .createTextureFromPngFile(texturePath, usePremultiply, onLoad);
        this.getRenderer().setIsPremultipliedAlpha(usePremultiply);
      }

      this._state = LoadStep.WaitLoadTexture;
    }
  }

  /**
   * 重建渲染器
   */
  public reloadRenderer(): void {
    this.deleteRenderer();
    this.createRenderer();
    this.setupTextures();
  }

  /**
   * 更新
   */
  public update(): void {
    if (this._state != LoadStep.CompleteSetup) return;

    const deltaTimeSeconds: number = LAppPal.getDeltaTime();
    this._userTimeSeconds += deltaTimeSeconds;

    this._dragManager.update(deltaTimeSeconds);
    this._dragX = this._dragManager.getX();
    this._dragY = this._dragManager.getY();

    // 是否通过运动进行参数更新
    let motionUpdated = false;

    //--------------------------------------------------------------------------
    this._model.loadParameters(); // 载入上一次保存的状态，是否通过运动进行参数更新
    if (this._motionManager.isFinished()) {
      // 没有动作再生时，从待机动作中随机再生
      this.startRandomMotion(
        LAppDefine.MotionGroupIdle,
        LAppDefine.PriorityIdle
      );
    } else {
      motionUpdated = this._motionManager.updateMotion(
        this._model,
        deltaTimeSeconds
      ); // 更新运动
    }
    this._model.saveParameters(); // 状态的保存
    //--------------------------------------------------------------------------

    // 眨眼
    if (!motionUpdated) {
      if (this._eyeBlink != null) {
        // 没有主运动更新时
        this._eyeBlink.updateParameters(this._model, deltaTimeSeconds); // 眨巴眼睛
      }
    }

    if (this._expressionManager != null) {
      this._expressionManager.updateMotion(this._model, deltaTimeSeconds); // 通过表情更新参数（相对变化）
    }

    // 拖动更改
    // 通过拖动调整脸部朝向
    this._model.addParameterValueById(this._idParamAngleX, this._dragX * 30); // 加-30到30的值
    this._model.addParameterValueById(this._idParamAngleY, this._dragY * 30);
    this._model.addParameterValueById(
      this._idParamAngleZ,
      this._dragX * this._dragY * -30
    );

    // 通过拖动调整身体方向
    this._model.addParameterValueById(
      this._idParamBodyAngleX,
      this._dragX * 10
    ); // 加-10到10的值

    // 通过拖动调整眼睛方向
    this._model.addParameterValueById(this._idParamEyeBallX, this._dragX); // 加-1到1的值
    this._model.addParameterValueById(this._idParamEyeBallY, this._dragY);

    // 呼吸等
    if (this._breath != null) {
      this._breath.updateParameters(this._model, deltaTimeSeconds);
    }

    // 设置物理运算
    if (this._physics != null) {
      this._physics.evaluate(this._model, deltaTimeSeconds);
    }

    // 设置唇同步
    if (this._lipsync) {
      if (!this._wavFileHandler.update(deltaTimeSeconds)) {
        // 获取声音
        let talkData = CharacterManager.getInstance().popAudioQueue();
        if (talkData) {
          this._wavFileHandler.start(talkData);
        }
      }

      let value = 0.0; // 当实时进行唇部同步时，从系统获取音量，并在0到1的范围内输入值
      value = this._wavFileHandler.getRms() * LAppDefine.LipSyncWeight;
      for (let i = 0; i < this._lipSyncIds.getSize(); ++i) {
        this._model.addParameterValueById(this._lipSyncIds.at(i), value, 1.0);
      }
    }

    // 姿势设置
    if (this._pose != null) {
      this._pose.updateParameters(this._model, deltaTimeSeconds);
    }

    this._model.update();
  }

  /**
   * 开始播放由参数指定的运动
   * @param group 运动组名称
   * @param no 组中的编号
   * @param priority 优先级
   * @param onFinishedMotionHandler 运动播放结束时调用的回调函数
   * @return 返回已开始运动的标识号。在isFinished（）的参数中使用，isFinished（）判断单独的运动是否结束。无法启动时[-1]
   */
  public startMotion(
    group: string,
    no: number,
    priority: number,
    onFinishedMotionHandler?: FinishedMotionCallback
  ): CubismMotionQueueEntryHandle {
    if (priority == LAppDefine.PriorityForce) {
      this._motionManager.setReservePriority(priority);
    } else if (!this._motionManager.reserveMotion(priority)) {
      if (this._debugMode) {
        LAppPal.printMessage("[APP]can't start motion.");
      }
      return InvalidMotionQueueEntryHandleValue;
    }

    const motionFileName = this._modelSetting.getMotionFileName(group, no);

    // ex) idle_0
    const name = `${group}_${no}`;
    let motion: CubismMotion = this._motions.getValue(name) as CubismMotion;
    let autoDelete = false;

    if (motion == null) {
      fetch(`${this._modelHomeDir}${motionFileName}`)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => {
          motion = this.loadMotion(
            arrayBuffer,
            arrayBuffer.byteLength,
            null,
            onFinishedMotionHandler
          );
          let fadeTime: number = this._modelSetting.getMotionFadeInTimeValue(
            group,
            no
          );

          if (fadeTime >= 0.0) {
            motion.setFadeInTime(fadeTime);
          }

          fadeTime = this._modelSetting.getMotionFadeOutTimeValue(group, no);
          if (fadeTime >= 0.0) {
            motion.setFadeOutTime(fadeTime);
          }

          motion.setEffectIds(this._eyeBlinkIds, this._lipSyncIds);
          autoDelete = true; // 退出时从内存中删除
        });
    } else {
      motion.setFinishedMotionHandler(onFinishedMotionHandler);
    }

    //voice
    // const voice = this._modelSetting.getMotionSoundFileName(group, no);
    // if (voice.localeCompare('') != 0) {
    //   let path = voice;
    //   path = this._modelHomeDir + path;
    //   this._wavFileHandler.start(path);
    // }

    if (this._debugMode) {
      LAppPal.printMessage(`[APP]start motion: [${group}_${no}`);
    }
    return this._motionManager.startMotionPriority(
      motion,
      autoDelete,
      priority
    );
  }

  /**
   * 开始播放随机选择的运动
   * @param group 运动组名称
   * @param priority 优先级
   * @param onFinishedMotionHandler 运动播放结束时调用的回调函数
   * @return 返回已开始运动的标识号。在isFinished（）的参数中使用，isFinished（）判断单独的运动是否结束。无法启动时[-1]
   */
  public startRandomMotion(
    group: string,
    priority: number,
    onFinishedMotionHandler?: FinishedMotionCallback
  ): CubismMotionQueueEntryHandle {
    if (this._modelSetting.getMotionCount(group) == 0) {
      return InvalidMotionQueueEntryHandleValue;
    }

    const no: number = Math.floor(
      Math.random() * this._modelSetting.getMotionCount(group)
    );

    return this.startMotion(group, no, priority, onFinishedMotionHandler);
  }

  /**
   * 设置参数指定的表情运动
   *
   * @param expressionId 表情运动ID
   */
  public setExpression(expressionId: string): void {
    const motion: ACubismMotion = this._expressions.getValue(expressionId);

    if (this._debugMode) {
      LAppPal.printMessage(`[APP]expression: [${expressionId}]`);
    }

    if (motion != null) {
      this._expressionManager.startMotionPriority(
        motion,
        false,
        LAppDefine.PriorityForce
      );
    } else {
      if (this._debugMode) {
        LAppPal.printMessage(`[APP]expression[${expressionId}] is null`);
      }
    }
  }

  /**
   * 设置随机选择的表情运动
   */
  public setRandomExpression(): void {
    if (this._expressions.getSize() == 0) {
      return;
    }

    const no: number = Math.floor(Math.random() * this._expressions.getSize());

    for (let i = 0; i < this._expressions.getSize(); i++) {
      if (i == no) {
        const name: string = this._expressions._keyValues[i].first;
        this.setExpression(name);
        return;
      }
    }
  }

  /**
   * 
   */
  public motionEventFired(eventValue: csmString): void {
    CubismLogInfo('{0} is fired on LAppModel!!', eventValue.s);
  }

  /**
   * 命中判定测试
   * 根据指定ID的顶点列表计算矩形，判定坐标是否在矩形范围内
   *
   * @param hitArenaName  测试命中判定的对象ID
   * @param x             进行判定X坐标
   * @param y             进行判定Y坐标
   */
  public hitTest(hitArenaName: string, x: number, y: number): boolean {
    // 透明时无中奖判定
    if (this._opacity < 1) {
      return false;
    }

    const count: number = this._modelSetting.getHitAreasCount();

    for (let i = 0; i < count; i++) {
      if (this._modelSetting.getHitAreaName(i) == hitArenaName) {
        const drawId: CubismIdHandle = this._modelSetting.getHitAreaId(i);
        return this.isHit(drawId, x, y);
      }
    }

    return false;
  }

  /**
   * 从组名中批量加载运动数据
   * 从内部的模型设置中获取运动数据的名称
   *
   * @param group 运动数据组名称
   */
  public preLoadMotionGroup(group: string): void {
    for (let i = 0; i < this._modelSetting.getMotionCount(group); i++) {
      const motionFileName = this._modelSetting.getMotionFileName(group, i);

      // ex) idle_0
      const name = `${group}_${i}`;
      if (this._debugMode) {
        LAppPal.printMessage(
          `[APP]load motion: ${motionFileName} => [${name}]`
        );
      }

      fetch(`${this._modelHomeDir}${motionFileName}`)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => {
          const tmpMotion: CubismMotion = this.loadMotion(
            arrayBuffer,
            arrayBuffer.byteLength,
            name
          );

          let fadeTime = this._modelSetting.getMotionFadeInTimeValue(group, i);
          if (fadeTime >= 0.0) {
            tmpMotion.setFadeInTime(fadeTime);
          }

          fadeTime = this._modelSetting.getMotionFadeOutTimeValue(group, i);
          if (fadeTime >= 0.0) {
            tmpMotion.setFadeOutTime(fadeTime);
          }
          tmpMotion.setEffectIds(this._eyeBlinkIds, this._lipSyncIds);

          if (this._motions.getValue(name) != null) {
            ACubismMotion.delete(this._motions.getValue(name));
          }

          this._motions.setValue(name, tmpMotion);

          this._motionCount++;
          if (this._motionManager && this._motionCount >= this._allMotionCount) {
            this._state = LoadStep.LoadTexture;

            // 停止所有运动
            this._motionManager.stopAllMotions();

            this._updating = false;
            this._initialized = true;

            this.createRenderer();
            this.setupTextures();
            this.getRenderer().startUp(gl);
          }
        });
    }
  }

  /**
   * 释放所有运动数据
   */
  public releaseMotions(): void {
    this._motions.clear();
  }

  /**
   * 释放所有表情数据
   */
  public releaseExpressions(): void {
    this._expressions.clear();
  }

  /**
   * 绘制模型的过程。传递要绘制模型的空间的视图投影矩阵
   */
  public doDraw(): void {
    if (this._model == null) return;

    // 传递画布大小
    const viewport: number[] = [0, 0, canvas.width, canvas.height];

    this.getRenderer().setRenderState(frameBuffer, viewport);
    this.getRenderer().drawModel();
  }

  /**
   * 绘制模型的过程。传递要绘制模型的空间的视图投影矩阵
   */
  public draw(matrix: CubismMatrix44): void {
    if (this._model == null) {
      return;
    }

    // 各读取结束后
    if (this._state == LoadStep.CompleteSetup) {
      matrix.multiplyByMatrix(this._modelMatrix);

      this.getRenderer().setMvpMatrix(matrix);

      this.doDraw();
    }
  }

  public async hasMocConsistencyFromFile() {
    CSM_ASSERT(this._modelSetting.getModelFileName().localeCompare(``));

    // CubismModel
    if (this._modelSetting.getModelFileName() != '') {
      const modelFileName = this._modelSetting.getModelFileName();

      const response = await fetch(`${this._modelHomeDir}${modelFileName}`);
      const arrayBuffer = await response.arrayBuffer();

      this._consistency = CubismMoc.hasMocConsistency(arrayBuffer);

      if (!this._consistency) {
        CubismLogInfo('Inconsistent MOC3.');
      } else {
        CubismLogInfo('Consistent MOC3.');
      }

      return this._consistency;
    } else {
      LAppPal.printMessage('Model data does not exist.');
    }
  }

  /**
   * 构造函数
   */
  public constructor() {
    super();

    this._modelSetting = null;
    this._modelHomeDir = null;
    this._userTimeSeconds = 0.0;

    this._eyeBlinkIds = new csmVector<CubismIdHandle>();
    this._lipSyncIds = new csmVector<CubismIdHandle>();

    this._motions = new csmMap<string, ACubismMotion>();
    this._expressions = new csmMap<string, ACubismMotion>();

    this._hitArea = new csmVector<csmRect>();
    this._userArea = new csmVector<csmRect>();
    
    this._idParamAngleX = CubismFramework.getIdManager().getId(
      CubismDefaultParameterId.ParamAngleX
    );
    this._idParamAngleY = CubismFramework.getIdManager().getId(
      CubismDefaultParameterId.ParamAngleY
    );
    this._idParamAngleZ = CubismFramework.getIdManager().getId(
      CubismDefaultParameterId.ParamAngleZ
    );
    this._idParamEyeBallX = CubismFramework.getIdManager().getId(
      CubismDefaultParameterId.ParamEyeBallX
    );
    this._idParamEyeBallY = CubismFramework.getIdManager().getId(
      CubismDefaultParameterId.ParamEyeBallY
    );
    this._idParamBodyAngleX = CubismFramework.getIdManager().getId(
      CubismDefaultParameterId.ParamBodyAngleX
    );

    if (LAppDefine.MOCConsistencyValidationEnable) {
      this._mocConsistency = true;
    }

    this._state = LoadStep.LoadAssets;
    this._expressionCount = 0;
    this._textureCount = 0;
    this._motionCount = 0;
    this._allMotionCount = 0;
    this._wavFileHandler = new LAppWavFileHandler();
    this._consistency = false;
  }

  _modelSetting: ICubismModelSetting; // 模型设置信息
  _modelHomeDir: string; // 模型设置所在的目录
  _userTimeSeconds: number; //增量时间累计值[秒]

  _eyeBlinkIds: csmVector<CubismIdHandle>; // 为模型设置的瞬时功能参数ID
  _lipSyncIds: csmVector<CubismIdHandle>; // 为模型设置的唇同步功能参数标识
  _motions: csmMap<string, ACubismMotion>; // 导入的运动列表
  _expressions: csmMap<string, ACubismMotion>; // 导入的表情列表

  _hitArea: csmVector<csmRect>;
  _userArea: csmVector<csmRect>;

  _idParamAngleX: CubismIdHandle; // 参数标识: ParamAngleX
  _idParamAngleY: CubismIdHandle; // 参数标识: ParamAngleY
  _idParamAngleZ: CubismIdHandle; // 参数标识: ParamAngleZ
  _idParamEyeBallX: CubismIdHandle; // 参数标识: ParamEyeBallX
  _idParamEyeBallY: CubismIdHandle; // 参数标识: ParamEyeBAllY
  _idParamBodyAngleX: CubismIdHandle; // 参数标识: ParamBodyAngleX

  _state: number; // 用于当前状态管理
  _expressionCount: number; // 表情数据计数
  _textureCount: number; // 纹理计数
  _motionCount: number; // 运动数据计数
  _allMotionCount: number; // 运动总数
  _wavFileHandler: LAppWavFileHandler; //wav文件处理程序
  _consistency: boolean; // 用于MOC3一致性检查管理
}
