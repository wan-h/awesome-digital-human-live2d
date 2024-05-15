/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { LogLevel } from '@framework/live2dcubismframework';

/**
 * 在Sample+App中使用的常数
 */

// Canvas width and height pixel values, or dynamic screen size ('auto').
export const CanvasSize: { width: number; height: number } | 'auto' = 'auto';

// 画面
export const ViewScale = 1.0;
export const ViewMaxScale = 2.0;
export const ViewMinScale = 0.8;

export const ViewLogicalLeft = -1.0;
export const ViewLogicalRight = 1.0;
export const ViewLogicalBottom = -1.0;
export const ViewLogicalTop = 1.0;

export const ViewLogicalMaxLeft = -2.0;
export const ViewLogicalMaxRight = 2.0;
export const ViewLogicalMaxBottom = -2.0;
export const ViewLogicalMaxTop = 2.0;

// 相对路径
export const ResourcesPath = './src/live2d/Resources/';

// 模型后面的背景图像文件
export const BackImageName = 'back_class_normal.png';

// 齿轮文件
export const GearImageName = 'icon_gear.png';

//模型定义----------------------------------
export const ModelsDesc: {[key: string]: string[]} = {
  心理师: ['Kei'],
  女友: ['Haru'],
  素人: ['Chitose', 'Mao', 'Miara', 'Tsumiki', 'Rice', 'Epsilon', 'Hibiki', 'Izumi', 'Haru', 'Shizuku', 'Hiyori']
}

// 与外部定义文件（json）匹配
export const MotionGroupIdle = 'Idle'; // 空闲
export const MotionGroupTapBody = 'TapBody'; // 点击身体的时候

// 与外部定义文件（json）匹配
export const HitAreaNameHead = 'Head';
export const HitAreaNameBody = 'Body';

// 运动优先级常数
export const PriorityNone = 0;
export const PriorityIdle = 1;
export const PriorityNormal = 2;
export const PriorityForce = 3;

// MOC3一致性验证选项
export const MOCConsistencyValidationEnable = true;

// 调试日志显示选项
export const DebugLogEnable = true;
export const DebugTouchLogEnable = false;

// 从框架输出的日志级别设置
export const CubismLoggingLevel: LogLevel = LogLevel.LogLevel_Verbose;

// 默认渲染目标大小
export const RenderTargetWidth = 1900;
export const RenderTargetHeight = 1000;
