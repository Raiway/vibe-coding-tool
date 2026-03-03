/**
 * JSON 格式校验工具
 */

import { SceneConfig, SceneCloudData } from '../types';

/**
 * 安全解析 JSON
 */
export function safeParseJson<T>(
  text: string
): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = JSON.parse(text);
    return { success: true, data };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : '未知解析错误';
    return { success: false, error: `JSON 解析失败: ${errorMessage}` };
  }
}

/**
 * 校验单个场景配置结构
 */
function validateSceneItem(item: unknown, index: number): string | null {
  if (typeof item !== 'object' || item === null) {
    return `scenes[${index}] 不是有效对象`;
  }

  const scene = item as Record<string, unknown>;

  // 检查必需字段
  if (typeof scene.id !== 'string' || !scene.id.trim()) {
    return `scenes[${index}].id 缺失或无效`;
  }
  if (typeof scene.name !== 'string' || !scene.name.trim()) {
    return `scenes[${index}].name 缺失或无效`;
  }
  if (typeof scene.systemPrompt !== 'string') {
    return `scenes[${index}].systemPrompt 缺失或无效`;
  }
  if (typeof scene.requirement !== 'string') {
    return `scenes[${index}].requirement 缺失或无效`;
  }

  // isDefault 是可选字段
  if (scene.isDefault !== undefined && typeof scene.isDefault !== 'boolean') {
    return `scenes[${index}].isDefault 类型错误`;
  }

  return null;
}

/**
 * 校验场景配置格式
 */
export function validateSceneConfig(data: unknown): { success: true; data: SceneCloudData } | { success: false; error: string } {
  if (typeof data !== 'object' || data === null) {
    return { success: false, error: '数据不是有效对象' };
  }

  const obj = data as Record<string, unknown>;

  // 检查 version 字段
  if (typeof obj.version !== 'string') {
    return { success: false, error: 'version 字段缺失或无效' };
  }

  // 检查 timestamp 字段
  if (typeof obj.timestamp !== 'number') {
    return { success: false, error: 'timestamp 字段缺失或无效' };
  }

  // 检查 scenes 字段
  if (!Array.isArray(obj.scenes)) {
    return { success: false, error: 'scenes 字段缺失或不是数组' };
  }

  // 校验每个场景项
  for (let i = 0; i < obj.scenes.length; i++) {
    const error = validateSceneItem(obj.scenes[i], i);
    if (error) {
      return { success: false, error };
    }
  }

  return {
    success: true,
    data: {
      version: obj.version,
      timestamp: obj.timestamp,
      scenes: obj.scenes as SceneConfig[],
    },
  };
}