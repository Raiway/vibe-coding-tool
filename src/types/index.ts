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
 * LLM API 请求参数（预留扩展接口）
 */
export interface LLMRequestParams {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
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
