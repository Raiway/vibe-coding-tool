import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * 语音识别状态
 */
export interface SpeechRecognitionState {
  transcript: string;          // 转录文本
  isListening: boolean;         // 是否正在录音
  isSupported: boolean;         // 是否支持语音识别
  error: string | null;         // 错误信息
  interimTranscript: string;     // 临时（未确定）的转录文本
}

/**
 * Web Speech API 语音识别 Hook
 * 兼容 Chrome 浏览器，使用 webkitSpeechRecognition
 */
export const useSpeechRecognition = () => {
  const [state, setState] = useState<SpeechRecognitionState>({
    transcript: '',
    isListening: false,
    isSupported: true,
    error: null,
    interimTranscript: '',
  });

  const recognitionRef = useRef<any>(null);
  const lastFinalIndexRef = useRef<number>(0);

  /**
   * 初始化语音识别实例
   */
  useEffect(() => {
    // 检查浏览器支持（优先使用 webkitSpeechRecognition 兼容 Chrome）
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setState(prev => ({
        ...prev,
        isSupported: false,
        error: '您的浏览器不支持语音识别功能，请使用 Chrome 浏览器。'
      }));
      return;
    }

    // 创建语音识别实例
    const recognition = new SpeechRecognition();
    recognition.continuous = true;  // 持续识别
    recognition.interimResults = true; // 返回临时结果
    recognition.lang = 'zh-CN';     // 设置语言为中文

    // 识别结果处理
    recognition.onresult = (event: any) => {
      let newFinalText = '';
      let newInterimText = '';

      // 从上次处理的位置开始遍历
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          newFinalText += transcript;
        } else {
          newInterimText += transcript;
        }
      }

      // 更新最后处理的索引
      lastFinalIndexRef.current = event.resultIndex + event.results.length;

      setState(prev => ({
        ...prev,
        transcript: prev.transcript + newFinalText,
        interimTranscript: newInterimText,
      }));
    };

    // 错误处理
    recognition.onerror = (event: any) => {
      console.error('语音识别错误:', event.error);
      let errorMessage = '语音识别发生错误';

      switch (event.error) {
        case 'no-speech':
          errorMessage = '未检测到语音输入';
          break;
        case 'audio-capture':
          errorMessage = '无法访问麦克风';
          break;
        case 'not-allowed':
          errorMessage = '麦克风权限被拒绝';
          break;
        case 'network':
          errorMessage = '网络连接问题';
          break;
        default:
          errorMessage = `语音识别错误: ${event.error}`;
      }

      setState(prev => ({
        ...prev,
        isListening: false,
        error: errorMessage,
        interimTranscript: '',
      }));
    };

    // 识别结束处理
    recognition.onend = () => {
      setState(prev => ({
        ...prev,
        isListening: false,
        interimTranscript: '',
      }));
    };

    // 识别开始处理
    recognition.onstart = () => {
      lastFinalIndexRef.current = 0;
      setState(prev => ({
        ...prev,
        isListening: true,
        error: null,
        interimTranscript: '',
      }));
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  /**
   * 开始录音
   */
  const startListening = useCallback(() => {
    if (!state.isSupported || !recognitionRef.current) {
      return;
    }

    setState(prev => ({
      ...prev,
      error: null
    }));

    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('启动语音识别失败:', error);
      setState(prev => ({
        ...prev,
        error: '启动语音识别失败'
      }));
    }
  }, [state.isSupported]);

  /**
   * 停止录音
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current && state.isListening) {
      recognitionRef.current.stop();
    }
  }, [state.isListening]);

  /**
   * 清空转录文本
   */
  const clearTranscript = useCallback(() => {
    lastFinalIndexRef.current = 0;
    setState(prev => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
      error: null
    }));
  }, []);

  /**
   * 手动更新转录文本（用于编辑）
   */
  const setTranscript = useCallback((text: string) => {
    setState(prev => ({
      ...prev,
      transcript: text
    }));
  }, []);

  /**
   * 切换录音状态
   */
  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  return {
    transcript: state.transcript,
    interimTranscript: state.interimTranscript,
    isListening: state.isListening,
    isSupported: state.isSupported,
    error: state.error,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    setTranscript,
  };
};
