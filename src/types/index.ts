/**
 * 应用状态枚举
 */
export enum AppState {
  IDLE = 'idle',           // 空闲状态
  RECORDING = 'recording', // 录音中
  PROCESSING = 'processing', // 处理中
}

/**
 * 状态配置
 */
export interface AppStateConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: 'mic' | 'loader-2' | 'check-circle';
}

/**
 * 场景类型
 */
export type SceneType = 'code' | 'video' | 'image' | 'storyboard' | 'script';

/**
 * 场景配置
 */
export interface SceneConfig {
  id: string;
  name: string;
  systemPrompt: string;
  requirement: string;
  isDefault?: boolean; // 标记是否为预设场景
}

/**
 * LLM API 请求参数（预留扩展接口）
 */
export interface LLMRequestParams {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  scene?: SceneType;
}

/**
 * LLM API 响应（预留扩展接口）
 */
export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * 历史记录项
 */
export interface HistoryItem {
  id: string;
  timestamp: number;
  rawText: string;
  optimizedText: string;
}

/**
 * 用户设置（加密存储）
 */
export interface UserSettings {
  passwordHash: string;  // SHA-256 哈希
  salt: string;          // 盐值
}

/**
 * 同步状态
 */
export type SyncStatus = 'idle' | 'uploading' | 'downloading' | 'success' | 'error';

/**
 * 云端场景配置格式
 */
export interface SceneCloudData {
  version: string;        // "1.0"
  timestamp: number;      // Unix 时间戳
  scenes: SceneConfig[];
}

/**
 * 自动同步目标
 */
export type SyncTarget = 'api' | 'scenes' | 'all';
