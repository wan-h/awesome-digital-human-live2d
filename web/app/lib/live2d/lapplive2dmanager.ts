/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { CubismMatrix44 } from '@live2dFramework/math/cubismmatrix44';
import { ACubismMotion } from '@live2dFramework/motion/acubismmotion';
import { csmVector } from '@live2dFramework/type/csmvector';

import * as LAppDefine from './lappdefine';
import { canvas } from './lappdelegate';
import { LAppModel } from './lappmodel';
import { LAppPal } from './lapppal';

export let s_instance: LAppLive2DManager = null;

/**
 * CubismModel的管理类别
 * 执行生成、废弃、点击事件处理和模型切换等功能
 */
export class LAppLive2DManager {
  /**
   * 返回一个类的实例
   * 如果未生成实例，则在内部生成实例
   *
   * @return 类实例
   */
  public static getInstance(): LAppLive2DManager {
    if (s_instance == null) {
      s_instance = new LAppLive2DManager();
    }

    return s_instance;
  }

  /**
   * 释放一个类的实例（单个）
   */
  public static releaseInstance(): void {
    if (s_instance != null) {
      s_instance = void 0;
    }

    s_instance = null;
  }

  /**
   * 返回当前场景中保留的模型
   *
   * @param no 模型列表索引值
   * @return 返回模型实例。如果索引值超出范围，则返回空值
   */
  public getModel(no: number): LAppModel {
    if (no < this._models.getSize()) {
      return this._models.at(no);
    }

    return null;
  }

  /**
   * 释放当前场景中保留的所有模型
   */
  public releaseAllModel(): void {
    for (let i = 0; i < this._models.getSize(); i++) {
      this._models.at(i).release();
      this._models.set(i, null);
    }

    this._models.clear();
  }

  /**
   * 画面拖动时处理
   *
   * @param x 画面的X坐标
   * @param y 画面的Y坐标
   */
  public onDrag(x: number, y: number): void {
    for (let i = 0; i < this._models.getSize(); i++) {
      const model: LAppModel = this.getModel(i);

      if (model) {
        model.setDragging(x, y);
      }
    }
  }

  /**
   * 画面点击时的处理
   *
   * @param x 画面的X坐标
   * @param y 画面的Y坐标
   */
  public onTap(x: number, y: number): void {
    if (LAppDefine.DebugLogEnable) {
      LAppPal.printMessage(
        `[APP]tap point: {x: ${x.toFixed(2)} y: ${y.toFixed(2)}}`
      );
    }

    // for (let i = 0; i < this._models.getSize(); i++) {
    //   if (this._models.at(i).hitTest(LAppDefine.HitAreaNameHead, x, y)) {
    //     if (LAppDefine.DebugLogEnable) {
    //       LAppPal.printMessage(
    //         `[APP]hit area: [${LAppDefine.HitAreaNameHead}]`
    //       );
    //     }
    //     this._models.at(i).setRandomExpression();
    //   } else if (this._models.at(i).hitTest(LAppDefine.HitAreaNameBody, x, y)) {
    //     if (LAppDefine.DebugLogEnable) {
    //       LAppPal.printMessage(
    //         `[APP]hit area: [${LAppDefine.HitAreaNameBody}]`
    //       );
    //     }
    //     this._models
    //       .at(i)
    //       .startRandomMotion(
    //         LAppDefine.MotionGroupTapBody,
    //         LAppDefine.PriorityNormal,
    //         this._finishedMotion
    //       );
    //   }
    // }
  }

  /**
   * 画面更新时的处理
   * 更新画面内容、动画或其他相关操作
   */
  public onUpdate(): void {
    const { width, height } = canvas;

    const modelCount: number = this._models.getSize();

    for (let i = 0; i < modelCount; ++i) {
      const projection: CubismMatrix44 = new CubismMatrix44();
      const model: LAppModel = this.getModel(i);

      if (model.getModel()) {
        // width: 1.0 height: 1.875 (人物模型一般都是高大于宽)
        if (model.getModel().getCanvasWidth() > 1.0 && width < height) {
          // 在纵向窗口中显示横向较长的模型时，根据模型的横向尺寸计算scale
          model.getModelMatrix().setWidth(2.0);
          projection.scale(1.0, width / height);
        } else {
          projection.scale(height / width, 1.0);
        }

        // 如果存在视图变换的矩阵
        if (this._viewMatrix != null) {
          projection.multiplyByMatrix(this._viewMatrix);
        }
      }

      model.update();
      model.draw(projection); // 这里的projection就包含了MVP中的VP变换
    }
  }

  /**
   * 切换场景
   * 在示例应用程序中切换模型集
   */
  public changeCharacter(character: string): void {
    const modelPath: string = LAppDefine.ResourcesPath + character + '/';
    if (LAppDefine.DebugLogEnable) {
      LAppPal.printMessage(`[APP]model change: ${modelPath}`);
    }
    let modelJsonName: string = character + '.model3.json';
    this.releaseAllModel();
    this._models.pushBack(new LAppModel());
    this._models.at(0).loadAssets(modelPath, modelJsonName);
    this._character = character;
  }

  public setViewMatrix(m: CubismMatrix44) {
    for (let i = 0; i < 16; i++) {
      this._viewMatrix.getArray()[i] = m.getArray()[i];
    }
  }

  /**
   * 构造函数
   */
  constructor() {
    this._viewMatrix = new CubismMatrix44();
    this._models = new csmVector<LAppModel>();
    this.changeCharacter(LAppDefine.ModelDefault);
  }

  _viewMatrix: CubismMatrix44; // 用于模型绘制的视图矩阵
  _models: csmVector<LAppModel>; // 模型实例容器
  _character: string; // 当前人物
  // 运动播放结束的回调函数
  _finishedMotion = (self: ACubismMotion): void => {
    LAppPal.printMessage('Motion Finished:');
  };
}
