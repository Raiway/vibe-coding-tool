import { useEffect, useState, useMemo, useCallback } from 'react';
import { Mic, Square, Settings, Sparkles, Volume2, Copy, Check, AlertCircle, X, Key, Globe, Eraser, Sun, Moon, Lock, Cloud, RefreshCw, Plus, Edit2, Code, Trash2, ChevronDown } from 'lucide-react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { LLMService, mockLLMService } from './services/llmService';
import { PasswordScreen } from './components/PasswordScreen';
import { CloudSync } from './components/CloudSync';
import { generateId, decryptData } from './utils/crypto';
import { SceneConfig, SyncTarget, SceneCloudData } from './types';

/**
 * 主题类型
 */
type Theme = 'light' | 'dark';

/**
 * 默认场景配置
 */
const DEFAULT_SCENE_CONFIGS: SceneConfig[] = [
  {
    id: 'code',
    name: '编程',
    systemPrompt: '你是一个专业的编程助手。请将以下用户的口语化描述，转化为清晰、结构化、可以直接用于 AI 编程工具（如 Claude、Cursor）的 Prompt。',
    requirement: `要求：
1. 将模糊的描述转化为具体的技术要求
2. 使用清晰、简洁的语言
3. 包含必要的上下文信息
4. 输出格式为纯文本，适合直接复制使用`,
    isDefault: true,
  },
  {
    id: 'video',
    name: '视频',
    systemPrompt: '你是一个专业的视频制作专家。请将以下用户的口语化描述，转化为清晰、结构化的视频制作指令和 Prompt。',
    requirement: `要求：
1. 明确视频风格、时长、分辨率等技术参数
2. 描述画面内容、镜头运动、转场效果
3. 包含背景音乐、字幕、特效等元素
4. 输出格式为纯文本，适合直接复制使用`,
    isDefault: true,
  },
  {
    id: 'image',
    name: '图片',
    systemPrompt: '你是一个专业的 AI 绘画专家。请将以下用户的口语化描述，转化为清晰、详细的图片生成 Prompt。',
    requirement: `要求：
1. 详细描述画面主体、背景、构图
2. 指定艺术风格、色彩调性、光影效果
3. 包含画质、视角、氛围等关键词
4. 输出格式为纯文本，适合直接复制使用`,
    isDefault: true,
  },
  {
    id: 'storyboard',
    name: '分镜',
    systemPrompt: '你是一个专业的影视分镜师。请将以下用户的口语化描述，转化为清晰的分镜脚本。',
    requirement: `要求：
1. 按镜头编号组织内容
2. 描述每个镜头的画面内容、景别、运镜方式
3. 包含时长估算和转场建议
4. 输出格式为纯文本，适合直接复制使用`,
    isDefault: true,
  },
  {
    id: 'script',
    name: '剧本',
    systemPrompt: '你是一个专业的编剧。请将以下用户的口语化描述，转化为规范的剧本内容。',
    requirement: `要求：
1. 使用标准剧本格式（场景、人物、对白、动作）
2. 明确场景时间、地点、人物
3. 对白自然流畅，符合人物性格
4. 输出格式为纯文本，适合直接复制使用`,
    isDefault: true,
  },
];

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
  const [autoSyncTargets] = useState<SyncTarget[]>(['api', 'scenes']);
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
  const [realtimeOptimize, setRealtimeOptimize] = useState(false);
  const [currentSceneId, setCurrentSceneId] = useState<string>('code');
  const [sceneConfigs, setSceneConfigs] = useState<SceneConfig[]>(DEFAULT_SCENE_CONFIGS);
  const [isEditingScene, setIsEditingScene] = useState(false);
  const [editingScene, setEditingScene] = useState<SceneConfig | null>(null);

  // 设置页面视图类型
  type SettingsView = 'main' | 'scenes' | 'api';
  const [settingsView, setSettingsView] = useState<SettingsView>('main');

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

  // 初始化：从 localStorage 加载配置
  useEffect(() => {
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

    // 加载场景配置
    const savedSceneConfigs = localStorage.getItem('vibe-coding-scene-configs');
    if (savedSceneConfigs) {
      try {
        setSceneConfigs(JSON.parse(savedSceneConfigs));
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

    // 获取当前场景配置
    const currentSceneConfig = sceneConfigs.find(s => s.id === currentSceneId);

    try {
      let result: string;
      if (apiConfig.useMock || !apiConfig.apiKey || !apiConfig.endpoint) {
        await new Promise(r => setTimeout(r, 500));
        result = mockLLMService.optimizePrompt(fullText, currentSceneConfig);
      } else {
        const service = new LLMService(apiConfig);
        const response = await service.generatePrompt({
          prompt: fullText,
          model: apiConfig.model,
          temperature: 0.7,
          maxTokens: 1000,
        }, currentSceneConfig);
        result = response.content;
      }

      setOptimizedText(result);

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
   * 场景配置加载完成（从云端）
   */
  const handleScenesLoaded = (scenes: SceneConfig[]) => {
    setSceneConfigs(scenes);
    localStorage.setItem('vibe-coding-scene-configs', JSON.stringify(scenes));
  };

  // GitHub 同步相关常量
  const GITHUB_SCENES_URL = 'https://api.github.com/repos/Raiway/vibe-coding-tool/contents/scenes.json';
  const ENCRYPTED_TOKEN = 'JAAVMQQsIxYnHhVRSW8GPCIUMwIHXgFYIF1qdXUjDS8oOV4VIlwBbA==';

  /**
   * 上传场景配置到 GitHub
   */
  const uploadSceneConfigs = useCallback(async (scenes: SceneConfig[]) => {
    const githubToken = decryptData(ENCRYPTED_TOKEN, password);
    if (!githubToken) return;

    try {
      const cloudData: SceneCloudData = {
        version: '1.0',
        timestamp: Date.now(),
        scenes,
      };
      const content = JSON.stringify(cloudData, null, 2);

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
      } catch {}

      const body: Record<string, unknown> = {
        message: 'update: 自动同步场景配置',
        content: btoa(unescape(encodeURIComponent(content))),
        branch: 'main',
      };
      if (sha) body.sha = sha;

      await fetch(GITHUB_SCENES_URL, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch {
      // 静默失败，自动同步不阻塞用户操作
    }
  }, [password]);

  // 防抖函数
  const debounce = <T extends (...args: never[]) => void>(fn: T, delay: number) => {
    let timer: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  // 防抖上传场景配置
  const debouncedUploadSceneConfigs = useMemo(
    () => debounce(uploadSceneConfigs, 2000),
    [uploadSceneConfigs]
  );

  // 自动同步：场景配置变更时
  useEffect(() => {
    if (autoSync && autoSyncTargets.includes('scenes') && sceneConfigs.length > 0) {
      debouncedUploadSceneConfigs(sceneConfigs);
    }
  }, [sceneConfigs, autoSync, autoSyncTargets, debouncedUploadSceneConfigs]);

  /**
   * 清空左侧内容
   */
  const handleClearLeft = () => {
    clearTranscript();
    setOptimizedText('');
    setOptimizeError('');
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

      {/* 主内容区 - 移动端上下布局，桌面端左右布局 */}
      <div className="flex-1 flex justify-center min-h-0 theme-transition p-2 sm:p-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-full sm:w-[60%] h-[60vh] flex flex-col sm:flex-row min-h-0 theme-transition rounded-xl overflow-hidden shadow-lg" style={{ borderColor: 'var(--border-color)', border: '1px solid var(--border-color)' }}>
        {/* 左侧/上方：语音转录（可编辑） */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 theme-transition sm:border-r" style={{ borderColor: 'var(--border-color)' }}>
          {/* 标题栏 */}
          <div className="h-12 sm:h-14 flex items-center justify-between px-3 sm:px-5 theme-transition" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
            <div className="flex items-center gap-2">
              <Volume2 size={16} className="sm:w-[18px]" style={{ color: 'var(--accent-primary)' }} />
              <span className="font-semibold text-sm sm:text-base theme-transition" style={{ color: 'var(--text-primary)' }}>语音转录</span>
              {/* 场景选择下拉菜单 */}
              <div className="relative ml-2">
                <select
                  value={currentSceneId}
                  onChange={(e) => setCurrentSceneId(e.target.value)}
                  className="appearance-none pl-2 pr-6 py-1 rounded-lg text-xs sm:text-sm font-medium theme-transition cursor-pointer outline-none"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  {sceneConfigs.map(scene => (
                    <option key={scene.id} value={scene.id}>{scene.name}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
              </div>
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
              {/* API 配置选择下拉菜单 */}
              {apiConfigData.configs.length > 0 ? (
                <div className="relative ml-2">
                  <select
                    value={apiConfigData.activeConfigId}
                    onChange={(e) => {
                      const newActiveId = e.target.value;
                      const newConfigData = { ...apiConfigData, activeConfigId: newActiveId };
                      setApiConfigData(newConfigData);
                      localStorage.setItem('vibe-coding-api-config', JSON.stringify(newConfigData));
                    }}
                    className="appearance-none pl-2 pr-6 py-1 rounded-lg text-xs sm:text-sm font-medium theme-transition cursor-pointer outline-none"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    {apiConfigData.configs.map(config => (
                      <option key={config.id} value={config.id}>
                        {config.useMock ? 'Mock' : (config.name || config.model || 'API')}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                </div>
              ) : (
                <span className="hidden sm:inline px-2.5 py-1 rounded-md text-xs font-medium theme-transition" style={{
                  background: apiConfig.useMock ? 'var(--bg-tertiary)' : 'var(--accent-bg)',
                  color: apiConfig.useMock ? 'var(--text-tertiary)' : 'var(--accent-primary)'
                }}>
                  {apiConfig.useMock ? 'Mock' : 'API'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* 一键优化按钮 - 非实时模式显示 */}
              {!realtimeOptimize && (
                <button
                  onClick={handleOptimize}
                  disabled={isOptimizing || !displayText}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium theme-transition disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: isOptimizing || !displayText ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                    color: isOptimizing || !displayText ? 'var(--text-tertiary)' : 'var(--text-inverse)'
                  }}
                >
                  {isOptimizing ? '处理中...' : '一键优化'}
                </button>
              )}
              {/* 处理中状态指示器 - 实时模式下处理时显示 */}
              {realtimeOptimize && isOptimizing && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium theme-transition" style={{
                  background: 'var(--accent-bg)',
                  color: 'var(--accent-primary)'
                }}>
                  <RefreshCw size={12} className="animate-spin" />
                  处理中
                </div>
              )}
              {/* 实时优化开关 */}
              <div className="flex items-center gap-1.5">
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
                <span className="text-xs theme-transition hidden sm:inline" style={{ color: 'var(--text-tertiary)' }}>实时</span>
              </div>
              {/* 复制按钮 */}
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
          <div className="rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden theme-transition flex flex-col max-h-[90vh]" style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)'
          }}>
            {/* 标题栏 - sticky 吸顶 */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 theme-transition shrink-0" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              {settingsView !== 'main' ? (
                <>
                  <button onClick={() => setSettingsView('main')} className="p-2 -ml-2 rounded-lg hover:bg-opacity-80 theme-transition" style={{ color: 'var(--text-secondary)' }}>
                    <ChevronDown size={20} className="rotate-90" />
                  </button>
                  <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
                    {settingsView === 'scenes' ? '场景配置' : 'API 配置'}
                  </h2>
                  <button onClick={() => { setIsSettingsOpen(false); setSettingsView('main'); }} className="p-2 rounded-lg hover:bg-opacity-80 theme-transition" style={{ color: 'var(--text-secondary)' }}>
                    <X size={20} />
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
                    <Key size={18} className="sm:w-5" style={{ color: 'var(--accent-primary)' }} />
                    <span>设置</span>
                  </h2>
                  <button onClick={() => { setIsSettingsOpen(false); setSettingsView('main'); }} className="p-2 rounded-lg hover:bg-opacity-80 theme-transition" style={{ color: 'var(--text-secondary)' }}>
                    <X size={20} />
                  </button>
                </>
              )}
            </div>

            {/* 内容区 - 可滚动 */}
            <div className="flex-1 overflow-y-auto min-h-0">

            {/* 场景管理页面 */}
            {settingsView === 'scenes' ? (
              isEditingScene && editingScene ? (
                /* 场景编辑面板 */
                <div className="p-4 sm:p-6 space-y-5">
                  <div className="flex items-center gap-2 mb-4">
                    <button onClick={() => { setIsEditingScene(false); setEditingScene(null); }} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
                      <ChevronDown size={18} className="rotate-90" />
                    </button>
                    <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {sceneConfigs.find(s => s.id === editingScene.id) ? '编辑场景' : '新增场景'}
                    </h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 theme-transition" style={{ color: 'var(--text-secondary)' }}>场景名称</label>
                    <input
                      type="text"
                      value={editingScene.name}
                      onChange={e => setEditingScene(s => s ? { ...s, name: e.target.value } : null)}
                      placeholder="场景名称"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl outline-none text-sm sm:text-base theme-transition"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 theme-transition" style={{ color: 'var(--text-secondary)' }}>场景 ID</label>
                    <input
                      type="text"
                      value={editingScene.id}
                      onChange={e => setEditingScene(s => s ? { ...s, id: e.target.value } : null)}
                      placeholder="scene-id"
                      disabled={editingScene.isDefault}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl outline-none text-sm sm:text-base theme-transition disabled:opacity-50"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 theme-transition" style={{ color: 'var(--text-secondary)' }}>System Prompt</label>
                    <textarea
                      value={editingScene.systemPrompt}
                      onChange={e => setEditingScene(s => s ? { ...s, systemPrompt: e.target.value } : null)}
                      placeholder="你是一个专业的 AI 助手..."
                      rows={4}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl outline-none text-sm sm:text-base theme-transition resize-none"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 theme-transition" style={{ color: 'var(--text-secondary)' }}>输出要求</label>
                    <textarea
                      value={editingScene.requirement}
                      onChange={e => setEditingScene(s => s ? { ...s, requirement: e.target.value } : null)}
                      placeholder="要求：&#10;1. ...&#10;2. ..."
                      rows={4}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl outline-none text-sm sm:text-base theme-transition resize-none"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        if (!editingScene) return;
                        const existingIndex = sceneConfigs.findIndex(s => s.id === editingScene.id);
                        let newConfigs: SceneConfig[];
                        if (existingIndex >= 0) {
                          newConfigs = [...sceneConfigs];
                          newConfigs[existingIndex] = editingScene;
                        } else {
                          newConfigs = [...sceneConfigs, editingScene];
                        }
                        setSceneConfigs(newConfigs);
                        localStorage.setItem('vibe-coding-scene-configs', JSON.stringify(newConfigs));
                        setIsEditingScene(false);
                        setEditingScene(null);
                      }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium theme-transition hover:opacity-90"
                      style={{ background: 'var(--accent-primary)', color: 'var(--text-inverse)' }}
                    >
                      保存场景
                    </button>
                    <button
                      onClick={() => { setIsEditingScene(false); setEditingScene(null); }}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium theme-transition hover:opacity-70"
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                /* 场景列表 */
                <div className="p-4 sm:p-6 space-y-4">
                  <button
                    onClick={() => {
                      setEditingScene({
                        id: generateId(),
                        name: `自定义场景 ${sceneConfigs.length + 1}`,
                        systemPrompt: '',
                        requirement: '',
                        isDefault: false,
                      });
                      setIsEditingScene(true);
                    }}
                    className="w-full py-2.5 rounded-xl text-sm font-medium theme-transition hover:opacity-90 flex items-center justify-center gap-2"
                    style={{ background: 'var(--accent-primary)', color: 'var(--text-inverse)' }}
                  >
                    <Plus size={16} />
                    添加场景
                  </button>

                  <div className="space-y-2">
                    {sceneConfigs.map(scene => (
                      <div
                        key={scene.id}
                        className="flex items-center justify-between p-3 rounded-xl theme-transition"
                        style={{
                          background: currentSceneId === scene.id ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
                          border: currentSceneId === scene.id ? '1px solid var(--accent-primary)' : '1px solid transparent'
                        }}
                      >
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setCurrentSceneId(scene.id)}>
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {scene.name}
                            {scene.isDefault && <span className="ml-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>(预设)</span>}
                          </p>
                          <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                            {scene.id}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => { setEditingScene({ ...scene }); setIsEditingScene(true); }}
                            className="p-1.5 rounded-lg theme-transition hover:opacity-70"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            <Edit2 size={14} />
                          </button>
                          {!scene.isDefault && (
                            <button
                              onClick={() => {
                                const newConfigs = sceneConfigs.filter(s => s.id !== scene.id);
                                setSceneConfigs(newConfigs);
                                localStorage.setItem('vibe-coding-scene-configs', JSON.stringify(newConfigs));
                                if (currentSceneId === scene.id) {
                                  setCurrentSceneId(newConfigs[0]?.id || 'code');
                                }
                              }}
                              className="p-1.5 rounded-lg theme-transition hover:opacity-70"
                              style={{ color: 'var(--error)' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : settingsView === 'api' ? (
              /* API 管理页面 */
              isEditingConfig && editingConfig ? (
                /* API 编辑面板 */
                <div className="p-4 sm:p-6 space-y-5">
                  <div className="flex items-center gap-2 mb-4">
                    <button onClick={() => { setIsEditingConfig(false); setEditingConfig(null); }} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
                      <ChevronDown size={18} className="rotate-90" />
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
                /* API 配置列表 */
                <div className="p-4 sm:p-6 space-y-4">
                  <button
                    onClick={handleAddConfig}
                    className="w-full py-2.5 rounded-xl text-sm font-medium theme-transition hover:opacity-90 flex items-center justify-center gap-2"
                    style={{ background: 'var(--accent-primary)', color: 'var(--text-inverse)' }}
                  >
                    <Plus size={16} />
                    添加配置
                  </button>

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
              )
            ) : (
              /* 主设置页面 */
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

                {/* 场景配置入口 */}
                <button
                  onClick={() => setSettingsView('scenes')}
                  className="w-full flex items-center justify-between p-3 sm:p-4 rounded-xl theme-transition hover:opacity-90"
                  style={{ background: 'var(--bg-tertiary)' }}
                >
                  <div className="flex items-center gap-3">
                    <Code size={18} style={{ color: 'var(--accent-primary)' }} />
                    <div className="text-left">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>场景配置</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        当前: {sceneConfigs.find(s => s.id === currentSceneId)?.name || '未选择'}
                      </p>
                    </div>
                  </div>
                  <ChevronDown size={18} className="-rotate-90" style={{ color: 'var(--text-tertiary)' }} />
                </button>

                {/* API 配置入口 */}
                <button
                  onClick={() => setSettingsView('api')}
                  className="w-full flex items-center justify-between p-3 sm:p-4 rounded-xl theme-transition hover:opacity-90"
                  style={{ background: 'var(--bg-tertiary)' }}
                >
                  <div className="flex items-center gap-3">
                    <Key size={18} style={{ color: 'var(--accent-primary)' }} />
                    <div className="text-left">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>API 配置</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {apiConfigData.configs.length > 0
                          ? `当前: ${apiConfigData.configs.find(c => c.id === apiConfigData.activeConfigId)?.name || '未选择'}`
                          : '暂无配置'}
                      </p>
                    </div>
                  </div>
                  <ChevronDown size={18} className="-rotate-90" style={{ color: 'var(--text-tertiary)' }} />
                </button>

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
            </div>
          </div>
        </div>
      )}

      {/* 云同步模态框 */}
      {isCloudSyncOpen && (
        <CloudSync
          password={password}
          apiConfig={apiConfigData}
          onConfigLoaded={handleConfigLoaded}
          sceneConfigs={sceneConfigs}
          onScenesLoaded={handleScenesLoaded}
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