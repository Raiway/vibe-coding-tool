import { AppState, AppStateConfig } from '../types';

/**
 * 应用状态配置映射
 */
export const AppStateConfigs: Record<AppState, AppStateConfig> = {
  [AppState.IDLE]: {
    label: '空闲',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    icon: 'mic',
  },
  [AppState.RECORDING]: {
    label: '录音中',
    color: 'text-red-500',
    bgColor: 'bg-red-100',
    icon: 'loader-2',
  },
  [AppState.PROCESSING]: {
    label: '处理中',
    color: 'text-blue-500',
    bgColor: 'bg-blue-100',
    icon: 'loader-2',
  },
};

/**
 * 按钮状态文案
 */
export const BUTTON_TEXT = {
  START_RECORDING: '开始录音',
  STOP_RECORDING: '停止录音',
  OPTIMIZE: '一键优化',
  OPTIMIZING: '优化中...',
  COPY: '复制到剪贴板',
  COPIED: '已复制！',
  CLEAR: '清空',
} as const;

/**
 * 错误提示
 */
export const ERROR_MESSAGES = {
  EMPTY_INPUT: '请先录音或输入内容',
  COPY_FAILED: '复制失败，请重试',
} as const;
