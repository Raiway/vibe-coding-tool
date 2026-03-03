# 语音转 Prompt 工具

一款简洁、现代化的 AI 语音转 Prompt 辅助工具，支持日间/夜间模式切换。

## 功能特性

- 🎙️ **语音识别**：使用浏览器原生 Web Speech API 实时转录语音
- ✨ **Prompt 优化**：将口语化描述转换为结构化 Prompt
- 🌙️ **主题切换**：支持日间/夜间模式，0.3秒平滑过渡
- 📋 **一键复制**：快速复制优化结果
- 🔧 **API 配置**：支持 Mock 模式和真实 API 模式

## 在线预览

项目已部署至 GitHub Pages：[https://[username].github.io/[repo-name]/](https://[username].github.io/[repo-name]/)

## 技术栈

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Lucide React (图标库)
- Web Speech API

## 主题配色

### 日间模式
- 主背景: `#F9FAFB`
- 面板背景: `#FFFFFF`
- 文字主色: `#1F2937`
- 强调色: `#6366F1`

### 夜间模式
- 主背景: `#111827`
- 面板背景: `#1F2937`
- 文字主色: `#F9FAFB`
- 强调色: `#818CF8`

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 浏览器兼容性

| 浏览器 | 支持状态 |
|---------|---------|
| Chrome | ✅ 完全支持 |
| Edge | ✅ 完全支持 |
| Safari | ⚠️ 部分支持 |
| Firefox | ⚠️ 部分支持 |

推荐使用 Chrome 浏览器以获得最佳体验。

## License

MIT
