import { useState } from 'react';
import { Download, Upload, AlertCircle, Check, RefreshCw } from 'lucide-react';
import { decryptData } from '../utils/crypto';
import { safeParseJson, validateSceneConfig } from '../utils/validators';
import { SceneConfig, SceneCloudData, SyncStatus } from '../types';

interface SceneSyncPanelProps {
  password: string;
  sceneConfigs: SceneConfig[];
  onScenesLoaded: (scenes: SceneConfig[]) => void;
}

const GITHUB_SCENES_URL = 'https://api.github.com/repos/Raiway/vibe-coding-tool/contents/scenes.json';
const ENCRYPTED_TOKEN = 'JAAVMQQsIxYnHhVRSW8GPCIUMwIHXgFYIF1qdXUjDS8oOV4VIlwBbA==';

/**
 * 将 UTF-8 字符串安全地编码为 Base64
 */
function utf8ToBase64(str: string): string {
  try {
    // 使用 TextEncoder 将字符串转换为 UTF-8 字节数组
    const bytes = new TextEncoder().encode(str);
    // 将字节数组转换为二进制字符串
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch {
    // 降级方案
    return btoa(unescape(encodeURIComponent(str)));
  }
}

/**
 * 从 Base64 安全地解码为 UTF-8 字符串
 */
function base64ToUtf8(base64: string): string {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return decodeURIComponent(escape(atob(base64)));
  }
}

/**
 * 重试函数（指数退避）
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export function SceneSyncPanel({ password, sceneConfigs, onScenesLoaded }: SceneSyncPanelProps) {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getToken = (): string => {
    return decryptData(ENCRYPTED_TOKEN, password);
  };

  const handleUpload = async () => {
    setStatus('uploading');
    setMessage(null);

    try {
      const githubToken = getToken();
      if (!githubToken) {
        throw new Error('Token 解密失败');
      }

      // 准备场景数据（明文 JSON）
      const cloudData: SceneCloudData = {
        version: '1.0',
        timestamp: Date.now(),
        scenes: sceneConfigs,
      };

      const content = JSON.stringify(cloudData, null, 2);

      // 获取现有文件的 SHA（如果存在）
      let sha = '';
      try {
        const getRes = await fetch(GITHUB_SCENES_URL, {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });
        if (getRes.ok) {
          const data = await getRes.json();
          sha = data.sha;
        }
      } catch {
        // 文件不存在，忽略
      }

      // 上传文件
      const body: Record<string, unknown> = {
        message: 'update: 同步场景配置',
        content: utf8ToBase64(content),
        branch: 'main',
      };
      if (sha) body.sha = sha;

      await retryWithBackoff(async () => {
        const res = await fetch(GITHUB_SCENES_URL, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json();
          if (res.status === 401 || res.status === 403) {
            throw new Error('GitHub Token 无效或已过期');
          }
          throw new Error(err.message || '上传失败');
        }
      });

      setStatus('success');
      setMessage({ type: 'success', text: '场景配置已上传到 GitHub' });
    } catch (err) {
      setStatus('error');
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '上传失败' });
    }
  };

  const handleDownload = async () => {
    setStatus('downloading');
    setMessage(null);

    try {
      const githubToken = getToken();
      if (!githubToken) {
        throw new Error('Token 解密失败');
      }

      const data = await retryWithBackoff(async () => {
        const res = await fetch(GITHUB_SCENES_URL, {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });

        if (res.status === 404) {
          throw new Error('云端暂无场景配置文件');
        }
        if (res.status === 401 || res.status === 403) {
          throw new Error('GitHub Token 无效或已过期');
        }
        if (!res.ok) {
          throw new Error('下载失败');
        }

        return await res.json();
      });

      // 解析内容
      const content = base64ToUtf8(data.content);
      const parseResult = safeParseJson<SceneCloudData>(content);

      if (!parseResult.success) {
        throw new Error(parseResult.error);
      }

      // 校验格式
      const validationResult = validateSceneConfig(parseResult.data);
      if (!validationResult.success) {
        throw new Error(`格式校验失败: ${validationResult.error}`);
      }

      // 加载场景配置
      onScenesLoaded(validationResult.data.scenes);
      setStatus('success');
      setMessage({ type: 'success', text: `已加载 ${validationResult.data.scenes.length} 个场景配置` });
    } catch (err) {
      setStatus('error');
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '下载失败' });
    }
  };

  const isLoading = status === 'uploading' || status === 'downloading';

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        场景配置将以明文 JSON 格式存储在 GitHub 仓库的 <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--bg-tertiary)' }}>scenes.json</code> 文件中。
      </p>

      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={handleUpload}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
          style={{ background: 'var(--accent-primary)', color: 'white' }}
        >
          {status === 'uploading' ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          {status === 'uploading' ? '上传中...' : '上传配置'}
        </button>
        <button
          onClick={handleDownload}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
        >
          {status === 'downloading' ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          {status === 'downloading' ? '下载中...' : '下载配置'}
        </button>
      </div>

      {/* 当前场景配置预览 */}
      <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
          当前本地场景配置 ({sceneConfigs.length} 个)
        </p>
        <div className="flex flex-wrap gap-2">
          {sceneConfigs.map(scene => (
            <span
              key={scene.id}
              className="px-2 py-1 rounded-lg text-xs"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              {scene.name}
              {scene.isDefault && ' (预设)'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}