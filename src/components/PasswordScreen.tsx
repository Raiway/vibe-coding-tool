import { useEffect, useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, Cloud } from 'lucide-react';
import { sha256 } from '../utils/crypto';

interface PasswordScreenProps {
  onAuthenticated: (password: string) => void;
}

const SALT = 'vibe-coding-tool-salt-2024';
const STORAGE_KEY = 'vibe-coding-auth';
const PRESET_HASH = '01ed7b3f0faa32a9de0424363e2501fc4d0d81b7396c2adbe3474a022287fc04';

export function PasswordScreen({ onAuthenticated }: PasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [storedHash, setStoredHash] = useState('');

  useEffect(() => {
    const init = async () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          setStoredHash(data.hash);
        } catch {}
      } else {
        const data = { hash: PRESET_HASH, salt: SALT };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        setStoredHash(PRESET_HASH);
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    const inputHash = await sha256(password + SALT);

    if (inputHash === storedHash) {
      sessionStorage.setItem('vibe-coding-session', 'authenticated');
      sessionStorage.setItem('vibe-coding-key', password);
      onAuthenticated(password);
    } else {
      setError('密码错误');
      setPassword('');
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center"
           style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-white text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center p-4"
         style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="w-full max-w-md">
        <div className="rounded-2xl shadow-2xl overflow-hidden"
             style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}>
          <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <Lock size={28} className="text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">AI Prompt 工具</h1>
            <p className="text-gray-500 text-sm">请输入密码以访问应用</p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 sm:px-8 pb-6 sm:pb-8">
            <div className="relative mb-4">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入密码"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 outline-none text-base focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm mb-4">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl text-white font-medium text-base transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              解锁
            </button>
          </form>

          <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-2">
            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(102, 126, 234, 0.1)' }}>
              <Cloud size={18} className="text-purple-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-gray-600">
                <p className="font-medium text-gray-700 mb-1">云同步配置</p>
                <p>API 配置可加密存储到 GitHub，跨设备安全同步</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-white/70 text-xs mt-6">
          私有工具 · 仅供授权用户使用
        </p>
      </div>
    </div>
  );
}