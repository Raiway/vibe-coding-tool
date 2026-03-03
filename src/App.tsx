import { useEffect, useState } from 'react';
import { Mic, Square, Settings, Sparkles, Volume2, Copy, Check, AlertCircle, X, Key, Globe, Info, Save, Eraser, Sun, Moon } from 'lucide-react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { LLMService, mockLLMService } from './services/llmService';

/**
 * 主题类型
 */
type Theme = 'light' | 'dark';

/**
 * Vibe Coding 语音转 Prompt 工具主应用组件
 */
function App() {
  const [theme, setTheme] = useState<Theme>('light');

  const {
    transcript,
    interimTranscript,
    isListening,
    error,
    toggleListening,
    clearTranscript,
    setTranscript,
  } = useSpeechRecognition();

  const [apiConfig, setApiConfig] = useState({
    apiKey: '',
    endpoint: '',
    model: '',
    useMock: true,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [optimizedText, setOptimizedText] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [optimizeError, setOptimizeError] = useState('');

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

  // 初始化：从 localStorage 加载配置
  useEffect(() => {
    const saved = localStorage.getItem('vibe-coding-api-config');
    if (saved) {
      try {
        setApiConfig(JSON.parse(saved));
      } catch {}
    }
  }, []);

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
      if (apiConfig.useMock || !apiConfig.apiKey || !apiConfig.endpoint) {
        await new Promise(r => setTimeout(r, 500));
        setOptimizedText(mockLLMService.optimizePrompt(fullText));
      } else {
        const service = new LLMService(apiConfig);
        const result = await service.generatePrompt({
          prompt: fullText,
          model: apiConfig.model,
          temperature: 0.7,
          maxTokens: 1000,
        });
        setOptimizedText(result.content);
      }
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
   * 保存配置
   */
  const handleSaveConfig = (config: typeof apiConfig) => {
    setApiConfig(config);
    localStorage.setItem('vibe-coding-api-config', JSON.stringify(config));
    setIsSettingsOpen(false);
  };

  /**
   * 清空左侧内容
   */
  const handleClearLeft = () => {
    clearTranscript();
  };

  const displayText = transcript + interimTranscript;

  return (
    <div className="h-screen w-screen flex flex-col theme-transition" style={{ fontSize: '16px' }}>
      {/* 顶部导航栏 */}
      <header className="h-16 flex items-center justify-between px-6 theme-transition" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
        {/* Logo 区域 */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center theme-transition shadow-md" style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}>
            <Sparkles size={20} style={{ color: 'var(--text-inverse)' }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold theme-transition" style={{ color: 'var(--text-primary)' }}>AI Prompt</h1>
            <p className="text-xs theme-transition" style={{ color: 'var(--text-tertiary)' }}>语音转助手</p>
          </div>
        </div>

        {/* 右侧按钮组 */}
        <div className="flex items-center gap-2">
          {/* 主题切换按钮 */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl theme-transition hover:opacity-80"
            style={{ background: 'var(--bg-tertiary)' }}
            title={theme === 'light' ? '切换到夜间模式' : '切换到日间模式'}
          >
            {theme === 'light' ? (
              <Moon size={20} style={{ color: 'var(--text-secondary)' }} />
            ) : (
              <Sun size={20} style={{ color: 'var(--text-secondary)' }} />
            )}
          </button>
          {/* 设置按钮 */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 rounded-xl theme-transition hover:opacity-80"
            style={{ background: 'var(--bg-tertiary)' }}
            title="设置"
          >
            <Settings size={20} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </header>

      {/* 主内容区 - 统一高度的左右面板 */}
      <div className="flex-1 flex min-h-0 theme-transition" style={{ background: 'var(--bg-primary)' }}>
        {/* 左侧：语音转录（可编辑） */}
        <div className="flex-1 flex flex-col min-w-0 theme-transition" style={{ borderRight: '1px solid var(--border-color)' }}>
          {/* 标题栏 - 固定高度 */}
          <div className="h-14 flex items-center justify-between px-5 theme-transition" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
            <div className="flex items-center gap-2">
              <Volume2 size={18} style={{ color: 'var(--accent-primary)' }} />
              <span className="font-semibold text-base theme-transition" style={{ color: 'var(--text-primary)' }}>实时语音转录</span>
            </div>
            <div className="flex items-center gap-2">
              {/* 麦克风按钮 - 移到左侧标题栏 */}
              <button
                onClick={toggleListening}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm theme-transition"
                style={{
                  background: isListening
                    ? 'linear-gradient(135deg, #EF4444, #F97316)'
                    : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                  color: 'white',
                  transform: isListening ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                {isListening ? (
                  <>
                    <Square size={16} className="fill-current" />
                    停止录音
                  </>
                ) : (
                  <>
                    <Mic size={16} />
                    开始录音
                  </>
                )}
              </button>
              {transcript && (
                <button
                  onClick={handleClearLeft}
                  className="p-2 rounded-lg theme-transition hover:opacity-70"
                  style={{ color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)' }}
                  title="清空内容"
                >
                  <Eraser size={16} />
                </button>
              )}
            </div>
          </div>
          {/* 可编辑的文本区域 */}
          <div className="flex-1 p-5 min-h-0">
            <textarea
              value={displayText}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="点击「开始录音」按钮，或直接输入文字..."
              className="w-full h-full text-base resize-none outline-none theme-transition font-mono leading-relaxed"
              style={{ background: 'transparent', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {/* 右侧：优化结果 */}
        <div className="flex-1 flex flex-col min-w-0 theme-transition" style={{ background: 'var(--bg-primary)' }}>
          {/* 标题栏 - 固定高度（与左侧一致） */}
          <div className="h-14 flex items-center justify-between px-5 theme-transition" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
            <div className="flex items-center gap-2">
              <Sparkles size={18} style={{ color: 'var(--accent-primary)' }} />
              <span className="font-semibold text-base theme-transition" style={{ color: 'var(--text-primary)' }}>优化结果</span>
              <span className="px-2.5 py-1 rounded-md text-xs font-medium theme-transition" style={{
                background: apiConfig.useMock ? 'var(--bg-tertiary)' : 'var(--accent-bg)',
                color: apiConfig.useMock ? 'var(--text-tertiary)' : 'var(--accent-primary)'
              }}>
                {apiConfig.useMock ? 'Mock 模式' : 'API 模式'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOptimize}
                disabled={isOptimizing || !displayText}
                className="px-4 py-2 rounded-xl text-sm font-medium theme-transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: isOptimizing || !displayText ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                  color: isOptimizing || !displayText ? 'var(--text-tertiary)' : 'var(--text-inverse)'
                }}
              >
                {isOptimizing ? '处理中...' : '一键优化'}
              </button>
              <button
                onClick={handleCopy}
                disabled={!optimizedText}
                className="px-4 py-2 rounded-xl text-sm font-medium theme-transition disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-70"
                style={{
                  background: !optimizedText ? 'var(--bg-tertiary)' : copied ? 'var(--success)' : 'var(--bg-tertiary)',
                  color: !optimizedText ? 'var(--text-tertiary)' : copied ? 'var(--text-inverse)' : 'var(--text-secondary)'
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
          {/* 错误提示 - 固定位置，不影响高度 */}
          {optimizeError && (
            <div className="mx-5 my-3 p-3 rounded-lg flex items-start gap-2.5 theme-transition" style={{
              background: 'var(--error-bg)',
              border: '1px solid var(--error-bg)'
            }}>
              <AlertCircle size={16} style={{ color: 'var(--error)' }} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm" style={{ color: 'var(--error-text)' }}>{optimizeError}</p>
            </div>
          )}
          {/* 内容区域 - 剩余空间 */}
          <div className="flex-1 p-5 overflow-auto min-h-0">
            {optimizedText ? (
              <p className="text-base font-mono leading-relaxed whitespace-pre-wrap theme-transition" style={{ color: 'var(--text-primary)' }}>
                {optimizedText}
              </p>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-center text-sm theme-transition" style={{ color: 'var(--text-tertiary)' }}>
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

      {/* 设置模态框 */}
      {isSettingsOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 theme-transition" style={{ background: theme === 'light' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.7)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden theme-transition" style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)'
          }}>
            <div className="flex items-center justify-between px-6 py-5 theme-transition" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h2 className="text-lg font-semibold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
                <Key size={20} style={{ color: 'var(--accent-primary)' }} />
                <span>API 配置</span>
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 rounded-lg hover:bg-opacity-80 theme-transition" style={{ color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-3 theme-transition" style={{ color: 'var(--text-secondary)' }}>工作模式</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setApiConfig(c => ({ ...c, useMock: false }))}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium theme-transition"
                    style={{
                      background: !apiConfig.useMock ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                      color: !apiConfig.useMock ? 'var(--text-inverse)' : 'var(--text-secondary)'
                    }}
                  >
                    API 模式
                  </button>
                  <button
                    type="button"
                    onClick={() => setApiConfig(c => ({ ...c, useMock: true }))}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium theme-transition"
                    style={{
                      background: apiConfig.useMock ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                      color: apiConfig.useMock ? 'var(--text-inverse)' : 'var(--text-secondary)'
                    }}
                  >
                    Mock 模式
                  </button>
                </div>
              </div>
              <div className={`space-y-5 transition-opacity ${apiConfig.useMock ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                  <label className="block text-sm font-medium mb-2.5 flex items-center gap-2 theme-transition" style={{ color: 'var(--text-secondary)' }}>
                    <Key size={16} />
                    <span>API Key</span>
                  </label>
                  <input
                    type="password"
                    value={apiConfig.apiKey}
                    onChange={e => setApiConfig(c => ({ ...c, apiKey: e.target.value }))}
                    placeholder="sk-xxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-3 rounded-xl outline-none text-base theme-transition"
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2.5 flex items-center gap-2 theme-transition" style={{ color: 'var(--text-secondary)' }}>
                    <Globe size={16} />
                    <span>API Endpoint</span>
                  </label>
                  <input
                    type="url"
                    value={apiConfig.endpoint}
                    onChange={e => setApiConfig(c => ({ ...c, endpoint: e.target.value }))}
                    placeholder="https://api.example.com/v1/chat/completions"
                    className="w-full px-4 py-3 rounded-xl outline-none text-base theme-transition"
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2.5 theme-transition" style={{ color: 'var(--text-secondary)' }}>模型名称</label>
                  <input
                    type="text"
                    value={apiConfig.model}
                    onChange={e => setApiConfig(c => ({ ...c, model: e.target.value }))}
                    placeholder="gpt-4, claude-3-opus-20240229..."
                    className="w-full px-4 py-3 rounded-xl outline-none text-base theme-transition"
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>
              {apiConfig.useMock && (
                <div className="flex items-start gap-3 p-4 rounded-xl theme-transition" style={{ background: 'var(--bg-tertiary)' }}>
                  <Info size={16} style={{ color: 'var(--accent-primary)' }} className="flex-shrink-0 mt-0.5" />
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Mock 模式会将输入包装为固定格式，不调用真实 API。
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 theme-transition" style={{ background: 'var(--bg-tertiary)', borderTop: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium theme-transition hover:opacity-70"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
              >
                取消
              </button>
              <button
                onClick={() => handleSaveConfig(apiConfig)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium theme-transition hover:opacity-90"
                style={{ background: 'var(--accent-primary)', color: 'var(--text-inverse)' }}
              >
                <Save size={16} />
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-20">
          <div className="px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg text-base theme-transition" style={{
            background: 'var(--error)',
            color: 'var(--text-inverse)'
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 底部状态栏 */}
      <div className="h-10 flex items-center justify-center px-6 theme-transition" style={{
        borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)'
      }}>
        <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full text-sm font-medium theme-transition" style={{
          background: isListening ? 'var(--error-bg)' : 'var(--bg-tertiary)',
          color: isListening ? 'var(--error)' : 'var(--text-tertiary)'
        }}>
          <div className="w-2 h-2 rounded-full theme-transition" style={{ background: isListening ? 'var(--error)' : 'var(--text-tertiary)' }} />
          {isListening ? '录音中...' : '等待录音'}
        </div>
      </div>
    </div>
  );
}

export default App;
