import { LLMRequestParams, LLMResponse, SceneConfig } from '../types';

/**
 * API 配置类型
 */
export interface APIConfig {
  apiKey: string;
  endpoint: string;
  model: string;
  useMock: boolean;
}

/**
 * LLM 服务类
 * 支持多种 LLM API 对接
 */
export class LLMService {
  private config: APIConfig;

  constructor(config: APIConfig) {
    this.config = config;
  }

  /**
   * 更新配置
   */
  updateConfig(config: APIConfig) {
    this.config = config;
  }

  /**
   * 发送请求到 LLM API
   * @param params 请求参数
   * @param sceneConfig 场景配置（可选）
   * @returns Promise<LLMResponse>
   */
  async generatePrompt(params: LLMRequestParams, sceneConfig?: SceneConfig): Promise<LLMResponse> {
    if (!this.config.apiKey || !this.config.endpoint) {
      throw new Error('API Key 和 Endpoint 未配置，请在设置中填写');
    }

    // 获取场景对应的 Prompt 模板
    const systemPrompt = sceneConfig?.systemPrompt || '你是一个专业的 AI 助手。';
    const requirement = sceneConfig?.requirement || '';

    // 构建请求体
    let body: any;
    let headers: any = {
      'Content-Type': 'application/json',
    };

    // 根据不同的 API 格式构建请求
    const isAnthropic = this.config.endpoint.includes('anthropic.com');
    const isDeepseek = this.config.endpoint.includes('deepseek.com');

    if (isAnthropic) {
      // Anthropic API 格式
      headers['x-api-key'] = this.config.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      body = {
        model: params.model || 'claude-3-opus-20240229',
        max_tokens: params.maxTokens || 1024,
        messages: [
          {
            role: 'user',
            content: `${systemPrompt}

用户描述：${params.prompt}

${requirement}`
          }
        ],
        temperature: params.temperature || 0.7,
      };
    } else {
      // OpenAI 兼容格式 (包括 Deepseek)
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      body = {
        model: params.model || (isDeepseek ? 'deepseek-chat' : 'gpt-4'),
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `用户描述：${params.prompt}

${requirement}`
          }
        ],
        temperature: params.temperature || 0.7,
        max_tokens: params.maxTokens || 1000,
      };
    }

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      // 解析不同 API 的响应格式
      let content: string;
      let usage: LLMResponse['usage'];

      if (isAnthropic) {
        content = data.content?.[0]?.text || data.content?.text || '';
        usage = data.usage ? {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        } : undefined;
      } else {
        // OpenAI 兼容格式
        content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
        usage = data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined;
      }

      if (!content) {
        throw new Error('API 返回了空内容');
      }

      return { content, usage };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('API 调用失败，请检查网络连接和配置');
    }
  }
}

/**
 * Mock LLM 服务
 * 用于测试 UI 交互流程
 */
export const mockLLMService = {
  /**
   * Mock 优化函数
   * 将用户输入包装为固定格式
   */
  optimizePrompt: (rawText: string, sceneConfig?: SceneConfig): string => {
    if (!rawText || rawText.trim() === '') {
      return '';
    }

    // Mock 逻辑：将左侧转录文本包装为固定格式
    return `[${sceneConfig?.name || '默认'}场景] 根据用户输入：${rawText}，请生成相关内容。`;
  },
};
