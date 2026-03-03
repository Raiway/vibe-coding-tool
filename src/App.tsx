import { useEffect, useState } from 'react';
import { Mic, Square, Settings, Sparkles, Volume2, Copy, Check, AlertCircle, X, Key, Globe, Eraser, Sun, Moon, History, Trash2, Lock, Cloud, RefreshCw, Plus, Edit2 } from 'lucide-react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { LLMService, mockLLMService } from './services/llmService';
import { PasswordScreen } from './components/PasswordScreen';
import { CloudSync } from './components/CloudSync';
import { HistoryItem } from './types';
import { generateId } from './utils/crypto';

/**
 * 主题类型
 */
type Theme = 'light' | 'dark';

/**
 * 单个 API 配置
 */
interface ApiConfig {
  id: string;
  name: string;
  apiKey: string;
  endpoint: string;
  model: string;
  useMock: boolean;
}

/**
 * API 配置数据（包含多个配置）
 */
interface ApiConfigData {
  configs: ApiConfig[];
  activeConfigId: string;
}

/**
 * Vibe Coding 语音转 Prompt 工具主应用组件
 */
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [theme, setTheme] = useState<Theme>('light');
  const [autoSync, setAutoSync] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);

  const {
    transcript,
    interimTranscript,
    isListening,
    error,
    toggleListening,
    clearTranscript,
    setTranscript,
  } = useSpeechRecognition();

  const [apiConfigData, setApiConfigData] = useState<ApiConfigData>({
    configs: [],
    activeConfigId: '',
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ApiConfig | null>(null);
  const [optimizedText, setOptimizedText] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [optimizeError, setOptimizeError] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [realtimeOptimize, setRealtimeOptimize] = useState(false);

  // 检查会话状态
  useEffect(() => {
    const session = sessionStorage.getItem('vibe-coding-session');
    if (session === 'authenticated') {
      setIsAuthenticated(true);
    }
  }, []);

  // 初始化主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('vibe-coding-theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  // 应用主题到文档
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vibe-coding-theme', theme);
  }, [theme]);

  // 初始化：从 localStorage 加载配置和历史
  useEffect(() => {
    // 加载历史记录
    const savedHistory = localStorage.getItem('vibe-coding-history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch {}
    }

    // 加载自动同步设置
    const savedAutoSync = localStorage.getItem('vibe-coding-auto-sync');
    if (savedAutoSync) {
      try {
        setAutoSync(JSON.parse(savedAutoSync));
      } catch {}
    }

    // 加载 API 配置（需要会话密钥解密）
    const savedConfig = localStorage.getItem('vibe-coding-api-config');
    if (savedConfig) {
      try {
        setApiConfigData(JSON.parse(savedConfig));
      } catch {}
    }
  }, [isAuthenticated]);

  // 获取当前活动配置
  const getActiveConfig = (): ApiConfig => {
    const activeConfig = apiConfigData.configs.find(c => c.id === apiConfigData.activeConfigId);
    return activeConfig || {
      id: '',
      name: '默认配置',
      apiKey: '',
      endpoint: '',
      model: '',
      useMock: true,
    };
  };

  const apiConfig = getActiveConfig();

  /**
   * 切换主题
   */
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  /**
   * 处理优化
   */
  const handleOptimize = async () => {
    const fullText = transcript + interimTranscript;
    if (!fullText?.trim()) {
      alert('请先录音或输入内容');
      return;
    }

    setIsOptimizing(true);
    setOptimizeError('');

    try {
      let result: string;
      if (apiConfig.useMock || !apiConfig.apiKey || !apiConfig.endpoint) {
        await new Promise(r => setTimeout(r, 500));
        result = mockLLMService.optimizePrompt(fullText);
      } else {
        const service = new LLMService(apiConfig);
        const response = await service.generatePrompt({
          prompt: fullText,
          model: apiConfig.model,
          temperature: 0.7,
          maxTokens: 1000,
        });
        result = response.content;
      }

      setOptimizedText(result);

      // 保存到历史记录
      const newItem: HistoryItem = {
        id: generateId(),
        timestamp: Date.now(),
        rawText: fullText,
        optimizedText: result,
      };
      const updatedHistory = [newItem, ...history].slice(0, 50); // 保留最近 50 条
      setHistory(updatedHistory);
      localStorage.setItem('vibe-coding-history', JSON.stringify(updatedHistory));

    } catch (err) {
      setOptimizeError(err instanceof Error ? err.message : '优化失败，请重试');
    } finally {
      setIsOptimizing(false);
    }
  };

  /**
   * 处理复制
   */
  const handleCopy = async () => {
    if (!optimizedText) return;
    try {
      await navigator.clipboard.writeText(optimizedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  /**
   * 切换自动同步
   */
  const toggleAutoSync = () => {
    const newValue = !autoSync;
    setAutoSync(newValue);
    localStorage.setItem('vibe-coding-auto-sync', JSON.stringify(newValue));
  };

  /**
   * 添加新配置
   */
  const handleAddConfig = () => {
    setEditingConfig({
      id: generateId(),
      name: `配置 ${apiConfigData.configs.length + 1}`,
      apiKey: '',
      endpoint: '',
      model: '',
      useMock: true,
    });
    setIsEditingConfig(true);
  };

  /**
   * 编辑现有配置
   */
  const handleEditConfig = (config: ApiConfig) => {
    setEditingConfig({ ...config });
    setIsEditingConfig(true);
  };

  /**
   * 删除配置
   */
  const handleDeleteConfig = (id: string) => {
    if (apiConfigData.configs.length <= 1) {
      alert('至少需要保留一个配置');
      return;
    }
    const newConfigs = apiConfigData.configs.filter(c => c.id !== id);
    const newActiveId = apiConfigData.activeConfigId === id
      ? newConfigs[0].id
      : apiConfigData.activeConfigId;
    const newData = { configs: newConfigs, activeConfigId: newActiveId };
    setApiConfigData(newData);
    localStorage.setItem('vibe-coding-api-config', JSON.stringify(newData));
  };

  /**
   * 切换活动配置
   */
  const handleSwitchConfig = (id: string) => {
    const newData = { ...apiConfigData, activeConfigId: id };
    setApiConfigData(newData);
    localStorage.setItem('vibe-coding-api-config', JSON.stringify(newData));
  };

  /**
   * 保存编辑的配置
   */
  const handleSaveEditingConfig = () => {
    if (!editingConfig) return;

    const existingIndex = apiConfigData.configs.findIndex(c => c.id === editingConfig.id);
    let newConfigs: ApiConfig[];

    if (existingIndex >= 0) {
      newConfigs = [...apiConfigData.configs];
      newConfigs[existingIndex] = editingConfig;
    } else {
      newConfigs = [...apiConfigData.configs, editingConfig];
    }

    const newData = {
      configs: newConfigs,
      activeConfigId: editingConfig.id || newConfigs[0]?.id || '',
    };

    setApiConfigData(newData);
    localStorage.setItem('vibe-coding-api-config', JSON.stringify(newData));
    setIsEditingConfig(false);
    setEditingConfig(null);
  };

  /**
   * 云同步配置加载完成
   */
  const handleConfigLoaded = (config: ApiConfigData) => {
    setApiConfigData(config);
    localStorage.setItem('vibe-coding-api-config', JSON.stringify(config));
  };

  /**
   * 清空左侧内容
   */
  const handleClearLeft = () => {
    clearTranscript();
    setOptimizedText('');
    setOptimizeError('');
  };

  /**
   * 从历史记录加载
   */
  const loadFromHistory = (item: HistoryItem) => {
    setTranscript(item.rawText);
    setOptimizedText(item.optimizedText);
    setShowHistory(false);
  };

  /**
   * 删除历史记录
   */
  const deleteHistoryItem = (id: string) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('vibe-coding-history', JSON.stringify(updated));
  };

  /**
   * 清空所有历史
   */
  const clearAllHistory = () => {
    if (confirm('确定要清空所有历史记录吗？')) {
      setHistory([]);
      localStorage.removeItem('vibe-coding-history');
    }
  };

  /**
   * 退出登录
   */
  const handleLogout = () => {
    sessionStorage.removeItem('vibe-coding-session');
    setIsAuthenticated(false);
  };

  const displayText = transcript + interimTranscript;

  // 实时优化：当文本变化且开启实时优化时，自动触发优化
  useEffect(() => {
    if (realtimeOptimize && displayText.trim()) {
      const timer = setTimeout(() => {
        handleOptimize();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [displayText, realtimeOptimize]);

  // 未认证时显示密码页面
  if (!isAuthenticated) {
    return <PasswordScreen onAuthenticated={(pwd) => { setPassword(pwd); setIsAuthenticated(true); }} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col theme-transition" style={{ fontSize: '16px' }}>
      {/* 顶部导航栏 */}
      <header className="h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6 theme-transition" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
        {/* Logo 区域 */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center theme-transition shadow-md" style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}>
            <Sparkles size={18} className="sm:w-5" style={{ color: 'var(--text-inverse)' }} />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-semibold theme-transition" style={{ color: 'var(--text-primary)' }}>AI Prompt</h1>
            <p className="text-xs theme-transition" style={{ color: 'var(--text-tertiary)' }}>语音转助手</p>
          </div>
          <div className="sm:hidden">
            <h1 className="text-base font-semibold theme-transition" style={{ color: 'var(--text-primary)' }}>AI Prompt</h1>
          </div>
        </div>

        {/* 右侧按钮组 */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* 历史按钮 */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 sm:p-2.5 rounded-xl theme-transition hover:opacity-80"
            style={{ background: 'var(--bg-tertiary)' }}
            title="历史记录"
          >
            <History size={18} className="sm:w-5 sm:h-5" style={{ color: 'var(--text-secondary)' }} />
          </button>
          {/* 主题切换按钮 */}
          <button
            onClick={toggleTheme}
            className="p-2 sm:p-2.5 rounded-xl theme-transition hover:opacity-80"
            style={{ background: 'var(--bg-tertiary)' }}
            title={theme === 'light' ? '切换到夜间模式' : '切换到日间模式'}
          >
            {theme === 'light' ? (
              <Moon size={18} className="sm:w-5 sm:h-5" style={{ color: 'var(--text-secondary)' }} />
            ) : (
              <Sun size={18} className="sm:w-5 sm:h-5" style={{ color: 'var(--text-secondary)' }} />
            )}
          </button>
          {/* 设置按钮 */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 sm:p-2.5 rounded-xl theme-transition hover:opacity-80"
            style={{ background: 'var(--bg-tertiary)' }}
            title="设置"
          >
            <Settings size={18} className="sm:w-5 sm:h-5" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </header>

      {/* 历史记录面板 */}
      {showHistory && (
        <div className="theme-transition" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>历史记录 ({history.length})</span>
            {history.length > 0 && (
              <button
                onClick={clearAllHistory}
                className="text-xs px-2 py-1 rounded-lg theme-transition hover:opacity-70"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--error)' }}
              >
                清空全部
              </button>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto">
            {history.length === 0 ? (
              <div className="py-6 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                暂无历史记录
              </div>
            ) : (
              history.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 px-4 py-2 cursor-pointer theme-transition hover:opacity-80"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  onClick={() => loadFromHistory(item)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{item.rawText}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(item.timestamp).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteHistoryItem(item.id); }}
                    className="p-1.5 rounded-lg theme-transition hover:opacity-70"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 主内容区 - 移动端上下布局，桌面端左右布局，占画面70% */}
      <div className="flex-1 flex items-center justify-center min-h-0 theme-transition p-2 sm:p-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-full h-[70vh] sm:h-[70vh] flex flex-col sm:flex-row min-h-0 theme-transition rounded-xl overflow-hidden shadow-lg" style={{ borderColor: 'var(--border-color)', border: '1px solid var(--border-color)' }}>
        {/* 左侧/上方：语音转录（可编辑） */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 theme-transition sm:border-r" style={{ borderColor: 'var(--border-color)' }}>
          {/* 标题栏 */}
          <div className="h-12 sm:h-14 flex items-center justify-between px-3 sm:px-5 theme-transition" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
            <div className="flex items-center gap-2">
              <Volume2 size={16} className="sm:w-[18px]" style={{ color: 'var(--accent-primary)' }} />
              <span className="font-semibold text-sm sm:text-base theme-transition" style={{ color: 'var(--text-primary)' }}>语音转录</span>
            </div>
            <div className="flex items-center gap-2">
              {/* 录音状态指示 */}
              {isListening && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium theme-transition animate-pulse" style={{
                  background: 'var(--error-bg)',
                  color: 'var(--error)'
                }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--error)' }} />
                  录音中
                </div>
              )}
              <button
                onClick={toggleListening}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-medium text-xs sm:text-sm theme-transition"
                style={{
                  background: isListening
                    ? 'linear-gradient(135deg, #EF4444, #F97316)'
                    : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                  color: 'white',
                }}
              >
                {isListening ? (
                  <>
                    <Square size={14} className="sm:w-4 fill-current" />
                    <span className="hidden xs:inline">停止</span>录音
                  </>
                ) : (
                  <>
                    <Mic size={14} className="sm:w-4" />
                    <span className="hidden xs:inline">开始</span>录音
                  </>
                )}
              </button>
              {transcript && (
                <button
                  onClick={handleClearLeft}
                  className="p-1.5 sm:p-2 rounded-lg theme-transition hover:opacity-70"
                  style={{ color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)' }}
                  title="清空内容"
                >
                  <Eraser size={14} className="sm:w-4" />
                </button>
              )}
            </div>
          </div>
          {/* 可编辑的文本区域 */}
          <div className="flex-1 p-3 sm:p-5 min-h-0">
            <textarea
              value={displayText}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="点击「开始录音」按钮，或直接输入文字..."
              className="w-full h-full text-sm sm:text-base resize-none outline-none theme-transition font-mono leading-relaxed"
              style={{ background: 'transparent', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {/* 分隔线（移动端） */}
        <div className="sm:hidden h-px theme-transition" style={{ background: 'var(--border-color)' }} />

        {/* 右侧/下方：优化结果 */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 theme-transition" style={{ background: 'var(--bg-primary)' }}>
          {/* 标题栏 */}
          <div className="h-12 sm:h-14 flex items-center justify-between px-3 sm:px-5 theme-transition" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="sm:w-[18px]" style={{ color: 'var(--accent-primary)' }} />
              <span className="font-semibold text-sm sm:text-base theme-transition" style={{ color: 'var(--text-primary)' }}>优化结果</span>
              <span className="hidden sm:inline px-2.5 py-1 rounded-md text-xs font-medium theme-transition" style={{
                background: apiConfig.useMock ? 'var(--bg-tertiary)' : 'var(--accent-bg)',
                color: apiConfig.useMock ? 'var(--text-tertiary)' : 'var(--accent-primary)'
              }}>
                {apiConfig.useMock ? 'Mock' : 'API'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* 实时优化开关 */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs theme-transition hidden sm:inline" style={{ color: 'var(--text-tertiary)' }}>实时</span>
                <button
                  onClick={() => setRealtimeOptimize(!realtimeOptimize)}
                  className="relative w-9 h-5 rounded-full theme-transition"
                  style={{ background: realtimeOptimize ? 'var(--accent-primary)' : 'var(--bg-tertiary)' }}
                  title="开启后自动优化输入内容"
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                    style={{ left: realtimeOptimize ? '18px' : '2px', transition: 'left 0.2s' }}
                  />
                </button>
              </div>
              <button
                onClick={handleOptimize}
                disabled={isOptimizing || !displayText || realtimeOptimize}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium theme-transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: isOptimizing || !displayText || realtimeOptimize ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                  color: isOptimizing || !displayText || realtimeOptimize ? 'var(--text-tertiary)' : 'var(--text-inverse)'
                }}
              >
                {isOptimizing ? '处理中...' : '一键优化'}
              </button>
              <button
                onClick={handleCopy}
                disabled={!optimizedText}
                className="p-1.5 sm:p-2 rounded-xl theme-transition disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-70"
                style={{
                  background: !optimizedText ? 'var(--bg-tertiary)' : copied ? 'var(--success)' : 'var(--bg-tertiary)',
                  color: !optimizedText ? 'var(--text-tertiary)' : copied ? 'var(--text-inverse)' : 'var(--text-secondary)'
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
          {/* 错误提示 */}
          {optimizeError && (
            <div className="mx-3 sm:mx-5 my-2 sm:my-3 p-2.5 sm:p-3 rounded-lg flex items-start gap-2 theme-transition text-sm" style={{
              background: 'var(--error-bg)',
              border: '1px solid var(--error-bg)'
            }}>
              <AlertCircle size={16} style={{ color: 'var(--error)' }} className="flex-shrink-0 mt-0.5" />
              <p style={{ color: 'var(--error-text)' }}>{optimizeError}</p>
            </div>
          )}
          {/* 内容区域 */}
          <div className="flex-1 p-3 sm:p-5 overflow-auto min-h-0">
            {optimizedText ? (
              <p className="text-sm sm:text-base font-mono leading-relaxed whitespace-pre-wrap theme-transition" style={{ color: 'var(--text-primary)' }}>
                {optimizedText}
              </p>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-center text-xs sm:text-sm theme-transition" style={{ color: 'var(--text-tertiary)' }}>
                  {!apiConfig.useMock && (!apiConfig.apiKey || !apiConfig.endpoint)
                    ? '请先在设置中配置 API'
                    : '点击「一键优化」按钮生成 Prompt'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* 设置模态框 */}
      {isSettingsOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 theme-transition p-4" style={{ background: theme === 'light' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.7)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden theme-transition max-h-[90vh] overflow-y-auto" style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)'
          }}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 theme-transition" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
                <Key size={18} className="sm:w-5" style={{ color: 'var(--accent-primary)' }} />
                <span>设置</span>
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 rounded-lg hover:bg-opacity-80 theme-transition" style={{ color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            {/* 编辑配置面板 - 保持背景可见 */}
            {isEditingConfig && editingConfig ? (
              <div className="p-4 sm:p-6 space-y-5">
                <div className="flex items-center gap-2 mb-4">
                  <button onClick={() => { setIsEditingConfig(false); setEditingConfig(null); }} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
                    <X size={18} />
                  </button>
                  <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {apiConfigData.configs.find(c => c.id === editingConfig.id) ? '编辑配置' : '新增配置'}
                  </h3>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 theme-transition" style={{ color: 'var(--text-secondary)' }}>配置名称</label>
                  <input
                    type="text"
                    value={editingConfig.name}
                    onChange={e => setEditingConfig(c => c ? { ...c, name: e.target.value } : null)}
                    placeholder="我的 API 配置"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl outline-none text-sm sm:text-base theme-transition"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3 theme-transition" style={{ color: 'var(--text-secondary)' }}>工作模式</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingConfig(c => c ? { ...c, useMock: false } : null)}
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm font-medium theme-transition"
                      style={{
                        background: !editingConfig.useMock ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        color: !editingConfig.useMock ? 'var(--text-inverse)' : 'var(--text-secondary)'
                      }}
                    >
                      API 模式
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingConfig(c => c ? { ...c, useMock: true } : null)}
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm font-medium theme-transition"
                      style={{
                        background: editingConfig.useMock ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        color: editingConfig.useMock ? 'var(--text-inverse)' : 'var(--text-secondary)'
                      }}
                    >
                      Mock 模式
                    </button>
                  </div>
                </div>

                <div className={`space-y-4 transition-opacity ${editingConfig.useMock ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2 theme-transition" style={{ color: 'var(--text-secondary)' }}>
                      <Key size={14} className="sm:w-4" />
                      <span>API Key</span>
                    </label>
                    <input
                      type="password"
                      value={editingConfig.apiKey}
                      onChange={e => setEditingConfig(c => c ? { ...c, apiKey: e.target.value } : null)}
                      placeholder="sk-xxxxxxxx"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl outline-none text-sm sm:text-base theme-transition"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2 theme-transition" style={{ color: 'var(--text-secondary)' }}>
                      <Globe size={14} className="sm:w-4" />
                      <span>API Endpoint</span>
                    </label>
                    <input
                      type="url"
                      value={editingConfig.endpoint}
                      onChange={e => setEditingConfig(c => c ? { ...c, endpoint: e.target.value } : null)}
                      placeholder="https://api.example.com/v1/chat/completions"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl outline-none text-sm sm:text-base theme-transition"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 theme-transition" style={{ color: 'var(--text-secondary)' }}>模型名称</label>
                    <input
                      type="text"
                      value={editingConfig.model}
                      onChange={e => setEditingConfig(c => c ? { ...c, model: e.target.value } : null)}
                      placeholder="gpt-4, claude-3-opus..."
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl outline-none text-sm sm:text-base theme-transition"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveEditingConfig}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium theme-transition hover:opacity-90"
                    style={{ background: 'var(--accent-primary)', color: 'var(--text-inverse)' }}
                  >
                    保存配置
                  </button>
                  <button
                    onClick={() => { setIsEditingConfig(false); setEditingConfig(null); }}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium theme-transition hover:opacity-70"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              /* 默认设置界面 */
              <div className="p-4 sm:p-6 space-y-5">
                {/* 云同步设置 */}
                <div>
                  <label className="block text-sm font-medium mb-3 theme-transition" style={{ color: 'var(--text-secondary)' }}>云同步</label>
                  <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="flex items-center gap-3">
                      <Cloud size={18} style={{ color: 'var(--accent-primary)' }} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>自动同步</p>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>开启后自动同步配置到云端</p>
                      </div>
                    </div>
                    <button
                      onClick={toggleAutoSync}
                      className="relative w-11 h-6 rounded-full theme-transition"
                      style={{ background: autoSync ? 'var(--accent-primary)' : 'var(--bg-primary)' }}
                    >
                      <span
                        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                        style={{ left: autoSync ? '22px' : '2px', transition: 'left 0.2s' }}
                      />
                    </button>
                  </div>
                  <button
                    onClick={() => setIsCloudSyncOpen(true)}
                    className="w-full mt-2 py-2.5 rounded-xl text-sm font-medium theme-transition hover:opacity-70 flex items-center justify-center gap-2"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-primary)' }}
                  >
                    <RefreshCw size={16} />
                    手动同步配置
                  </button>
                </div>

                {/* API 配置列表 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium theme-transition" style={{ color: 'var(--text-secondary)' }}>API 配置</label>
                    <button
                      onClick={handleAddConfig}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium theme-transition hover:opacity-70"
                      style={{ background: 'var(--accent-primary)', color: 'var(--text-inverse)' }}
                    >
                      <Plus size={14} />
                      添加
                    </button>
                  </div>

                  <div className="space-y-2">
                    {apiConfigData.configs.length === 0 ? (
                      <div className="text-center py-6 rounded-xl" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                        <p className="text-sm">暂无配置</p>
                        <p className="text-xs mt-1">点击上方添加按钮创建配置</p>
                      </div>
                    ) : (
                      apiConfigData.configs.map(config => (
                        <div
                          key={config.id}
                          className="flex items-center justify-between p-3 rounded-xl theme-transition"
                          style={{
                            background: apiConfigData.activeConfigId === config.id ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
                            border: apiConfigData.activeConfigId === config.id ? '1px solid var(--accent-primary)' : '1px solid transparent'
                          }}
                        >
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleSwitchConfig(config.id)}>
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{config.name}</p>
                            <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                              {config.useMock ? 'Mock 模式' : (config.model || '未设置模型')}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => handleEditConfig(config)}
                              className="p-1.5 rounded-lg theme-transition hover:opacity-70"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteConfig(config.id)}
                              className="p-1.5 rounded-lg theme-transition hover:opacity-70"
                              style={{ color: 'var(--error)' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 退出登录按钮 */}
                <button
                  onClick={handleLogout}
                  className="w-full py-2.5 rounded-xl text-sm font-medium theme-transition hover:opacity-70 flex items-center justify-center gap-2"
                  style={{ background: 'var(--error-bg)', color: 'var(--error)' }}
                >
                  <Lock size={16} />
                  退出登录
                </button>
              </div>
            )}

            {/* 底部按钮 - 仅在非编辑模式显示 */}
            {!isEditingConfig && (
              <div className="flex justify-end gap-2 px-4 sm:px-6 py-3 sm:py-4 theme-transition" style={{ background: 'var(--bg-tertiary)', borderTop: '1px solid var(--border-color)' }}>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium theme-transition hover:opacity-70"
                  style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
                >
                  关闭
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 云同步模态框 */}
      {isCloudSyncOpen && (
        <CloudSync
          password={password}
          apiConfig={apiConfigData}
          onConfigLoaded={handleConfigLoaded}
          onClose={() => setIsCloudSyncOpen(false)}
        />
      )}

      {/* 语音识别错误提示 */}
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-20 px-4">
          <div className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg flex items-center gap-2 shadow-lg text-sm sm:text-base theme-transition" style={{
            background: 'var(--error)',
            color: 'var(--text-inverse)'
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;