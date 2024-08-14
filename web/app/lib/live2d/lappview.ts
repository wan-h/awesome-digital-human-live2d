/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { CubismMatrix44 } from '@live2dFramework/math/cubismmatrix44';
import { CubismViewMatrix } from '@live2dFramework/math/cubismviewmatrix';

import * as LAppDefine from './lappdefine';
import { canvas, gl, LAppDelegate } from './lappdelegate';
import { LAppLive2DManager } from './lapplive2dmanager';
import { LAppPal } from './lapppal';
import { LAppSprite } from './lappsprite';
import { TextureInfo } from './lapptexturemanager';
import { TouchManager } from './touchmanager';

/**
 * 绘图类
 */
export class LAppView {
  /**
   * 构造函数
   */
  constructor() {
    this._programId = null;
    // this._back = null;

    // 触摸事件管理
    this._touchManager = new TouchManager();

    // 用于将设备坐标转换为屏幕坐标
    this._deviceToScreen = new CubismMatrix44();

    // 进行画面的显示的放大缩小和移动的变换的行列（视角变换）
    this._viewMatrix = new CubismViewMatrix();
  }

  /**
   * 初期化する。
   */
  public initialize(): void {
    const { width, height } = canvas;

    const ratio: number = width / height;
    const left: number = -ratio;
    const right: number = ratio;
    const bottom: number = LAppDefine.ViewLogicalLeft;
    const top: number = LAppDefine.ViewLogicalRight;

    // 设置screen边框 [-width / height, width / height, 1.0, 1.0]
    this._viewMatrix.setScreenRect(left, right, bottom, top);
    // 设置x, y的缩放系数 (1.0, 1.0)
    this._viewMatrix.scale(LAppDefine.ViewScale, LAppDefine.ViewScale);
    // 初始化变换矩阵为单位矩阵
    this._deviceToScreen.loadIdentity();
    // 以长边计算缩放系数
    if (width > height) {
      const screenW: number = Math.abs(right - left);
      this._deviceToScreen.scaleRelative(screenW / width, -screenW / width);
    } else {
      const screenH: number = Math.abs(top - bottom);
      this._deviceToScreen.scaleRelative(screenH / height, -screenH / height);
    }
    // 设置变换矩阵的平移系数 (-width * 0.5, -height * 0.5),这里计算是乘了上面的缩放系数的，所以用原始值就可以
    // 这一步是为了将图像中心点移动到 (0, 0)
    this._deviceToScreen.translateRelative(-width * 0.5, -height * 0.5);

    // 设置缩放系数的最大值和最小值
    this._viewMatrix.setMaxScale(LAppDefine.ViewMaxScale);
    this._viewMatrix.setMinScale(LAppDefine.ViewMinScale);

    // 表示可显示的最大范围
    this._viewMatrix.setMaxScreenRect(
      LAppDefine.ViewLogicalMaxLeft,
      LAppDefine.ViewLogicalMaxRight,
      LAppDefine.ViewLogicalMaxBottom,
      LAppDefine.ViewLogicalMaxTop
    );
  }

  /**
   * 解放函数
   */
  public release(): void {
    this._viewMatrix = null;
    this._touchManager = null;
    this._deviceToScreen = null;

    // if (this._back) {
    //   this._back.release();
    //   this._back = null;
    // }

    gl.deleteProgram(this._programId);
    this._programId = null;
  }

  /**
   * 绘制。
   */
  public render(): void {
    gl.useProgram(this._programId);

    // if (this._back) {
    //   this._back.render(this._programId);
    // }

    // 立即将缓冲区的所有数据发送给GPU并绘制最新的内容
    gl.flush();

    const live2DManager: LAppLive2DManager = LAppLive2DManager.getInstance();

    // 这里只设置了各种边界条件，_viewMatrix实际值还是一个单位矩阵
    /* _maxBottom: -2
    *  _maxLeft: -2
    *  _maxRight: 2
    *  _maxTop: 2
    *  _maxScale: 2
    *  _minScale: 0.8
    *  _screenBottom: -1
    *  _screenLeft: -1.2 (-canvas.width / canvas.height )
    *  _screenRight: 1.2 ( canvas.width / canvas.height )
    *  _screenTop: 1
    */
    live2DManager.setViewMatrix(this._viewMatrix);

    live2DManager.onUpdate();
  }

  /**
   * 初始化图像
   */
  public initializeSprite(): void {
    // 背景画像初期化
    // this.setBackground(null);

    // 创建着色器
    if (this._programId == null) {
      this._programId = LAppDelegate.getInstance().createShader();
    }
  }

  /**
   * 设置背景图片
   *
   * @param imageName 背景图片名称
   */
  // public setBackground(imageName: string | null): void {
  //   if (imageName == null) {
  //     this._back = null;
  //     return;
  //   }
  //   const width: number = canvas.width;
  //   const height: number = canvas.height;

  //   const textureManager = LAppDelegate.getInstance().getTextureManager();
  //   const bgResourcesPath = LAppDefine.BgResourcesPath;

  //   // 异步回调函数
  //   const initBackGroundTexture = (textureInfo: TextureInfo): void => {
  //     const x: number = width * 0.5;
  //     const y: number = height * 0.5;

  //     const fwidth = textureInfo.width * 2.0;
  //     const fheight = height * 1.0;
  //     this._back = new LAppSprite(x, y, fwidth, fheight, textureInfo.id);
  //   };
  //   // 从png图像中创建纹理
  //   textureManager.createTextureFromPngFile(
  //     bgResourcesPath + imageName + '.jpg',
  //     false,
  //     initBackGroundTexture
  //   );
  //   this._backImage = imageName;
  // }

  /**
   * 开始触摸时触发
   *
   * @param pointX 屏幕X坐标
   * @param pointY 屏幕Y坐标
   */
  public onTouchesBegan(pointX: number, pointY: number): void {
    this._touchManager.touchesBegan(pointX, pointY);
  }

  /**
   * 触摸移动时触发
   *
   * @param pointX 屏幕X坐标
   * @param pointY 屏幕Y坐标
   */
  public onTouchesMoved(pointX: number, pointY: number): void {
    const viewX: number = this.transformViewX(this._touchManager.getX());
    const viewY: number = this.transformViewY(this._touchManager.getY());

    this._touchManager.touchesMoved(pointX, pointY);

    const live2DManager: LAppLive2DManager = LAppLive2DManager.getInstance();
    live2DManager.onDrag(viewX, viewY);
  }

  /**
   * 触摸结束时触发
   *
   * @param pointX 屏幕X坐标
   * @param pointY 屏幕Y坐标
   */
  public onTouchesEnded(pointX: number, pointY: number): void {
    // 触摸结束
    const live2DManager: LAppLive2DManager = LAppLive2DManager.getInstance();
    live2DManager.onDrag(0.0, 0.0);

    {
      // 点击
      const x: number = this._deviceToScreen.transformX(
        this._touchManager.getX()
      ); // 获取逻辑坐标转换后的X坐标
      const y: number = this._deviceToScreen.transformY(
        this._touchManager.getY()
      ); // 获取逻辑坐标变化的Y坐标

      if (LAppDefine.DebugTouchLogEnable) {
        LAppPal.printMessage(`[APP]touchesEnded x: ${x} y: ${y}`);
      }
      live2DManager.onTap(x, y);

    }
  }

  /**
   * 将X坐标转换为View坐标
   *
   * @param deviceX 设备X坐标
   */
  public transformViewX(deviceX: number): number {
    const screenX: number = this._deviceToScreen.transformX(deviceX); // 获取逻辑坐标转换后的坐标
    return this._viewMatrix.invertTransformX(screenX); // 放大、缩小和移动后的值
  }

  /**
   * 将Y坐标转换为View坐标
   *
   * @param deviceY 设备Y坐标
   */
  public transformViewY(deviceY: number): number {
    const screenY: number = this._deviceToScreen.transformY(deviceY); // 获取逻辑坐标转换后的坐标
    return this._viewMatrix.invertTransformY(screenY);
  }

  /**
   * 将X坐标转换为Screen坐标
   * @param deviceX 设备X坐标
   */
  public transformScreenX(deviceX: number): number {
    return this._deviceToScreen.transformX(deviceX);
  }

  /**
   * 将Y坐标转换为Screen坐标
   *
   * @param deviceY 设备Y坐标
   */
  public transformScreenY(deviceY: number): number {
    return this._deviceToScreen.transformY(deviceY);
  }

  _touchManager: TouchManager; // 触摸管理器
  _deviceToScreen: CubismMatrix44; // 从设备到屏幕的矩阵，这里是为了坐标转换
  _viewMatrix: CubismViewMatrix; // viewMatrix
  _programId: WebGLProgram; // 着色器标识
  // _back: LAppSprite; // 背景画像
  // _backImage: string; // 背景图片
  _changeModel: boolean; // 模型切换标志
  _isClick: boolean; // 单击
}
