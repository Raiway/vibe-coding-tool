import { useState } from 'react';
import { Cloud, Download, Upload, AlertCircle, Check } from 'lucide-react';
import { encryptData, decryptData } from '../utils/crypto';

interface ApiConfigData {
  configs: Array<{
    id: string;
    name: string;
    apiKey: string;
    endpoint: string;
    model: string;
    useMock: boolean;
  }>;
  activeConfigId: string;
}

interface CloudSyncProps {
  password: string;
  apiConfig: ApiConfigData;
  onConfigLoaded: (config: ApiConfigData) => void;
  onClose: () => void;
}

const GITHUB_CONFIG_URL = 'https://api.github.com/repos/Raiway/vibe-coding-tool/contents/config.enc.json';
const ENCRYPTED_TOKEN = 'JAAVMQQsIxYnHhVRSW8GPCIUMwIHXgFYIF1qdXUjDS8oOV4VIlwBbA==';

export function CloudSync({ password, apiConfig, onConfigLoaded, onClose }: CloudSyncProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getToken = (): string => {
    return decryptData(ENCRYPTED_TOKEN, password);
  };

  const handleUpload = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const githubToken = getToken();
      if (!githubToken) {
        throw new Error('Token 解密失败');
      }

      const configData = JSON.stringify(apiConfig);
      const encrypted = encryptData(configData, password);

      let sha = '';
      try {
        const getRes = await fetch(GITHUB_CONFIG_URL, {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });
        if (getRes.ok) {
          const data = await getRes.json();
          sha = data.sha;
        }
      } catch {}

      const body: any = {
        message: 'update: 同步 API 配置',
        content: btoa(unescape(encodeURIComponent(JSON.stringify({
          encrypted: encrypted,
          timestamp: Date.now(),
          version: '1.0'
        })))),
        branch: 'main',
      };
      if (sha) body.sha = sha;

      const res = await fetch(GITHUB_CONFIG_URL, {
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
        throw new Error(err.message || '上传失败');
      }

      setMessage({ type: 'success', text: '配置已加密上传到 GitHub' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '上传失败' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const githubToken = getToken();
      if (!githubToken) {
        throw new Error('Token 解密失败');
      }

      const res = await fetch(GITHUB_CONFIG_URL, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!res.ok) {
        throw new Error('配置文件不存在或无权限访问');
      }

      const data = await res.json();
      const content = JSON.parse(decodeURIComponent(escape(atob(data.content))));
      const decrypted = decryptData(content.encrypted, password);

      if (!decrypted) {
        throw new Error('解密失败，密码可能不正确');
      }

      const config = JSON.parse(decrypted);
      onConfigLoaded(config);
      setMessage({ type: 'success', text: '配置已成功加载' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '下载失败' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Cloud size={18} style={{ color: 'var(--accent-primary)' }} />
            云同步配置
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>✕</button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            API 配置将使用密码加密后安全存储在 GitHub 仓库中，可跨设备同步。
          </p>

          {message && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
              {message.text}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={handleUpload} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50" style={{ background: 'var(--accent-primary)', color: 'white' }}>
              <Upload size={16} />
              {loading ? '处理中...' : '上传配置'}
            </button>
            <button onClick={handleDownload} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
              <Download size={16} />
              {loading ? '处理中...' : '下载配置'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}