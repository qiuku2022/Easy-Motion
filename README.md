# EasyMotion

> 更新：2026-06-20（M8 导出渲染已落地）
> 用自然语言制作 Remotion 动画的桌面应用（Electron + React + Python）

![EasyMotion 主界面：预设库、折线图预览、参数取色器与时间线编辑](docs/images/app-screenshot.png)

Monorepo（`apps/*` + `packages/*`），当前可运行范围：

| 模块 | 状态 | 说明 |
|------|------|------|
| Electron 主进程 | M1–M8 ✅ | 项目 / 时间线 / 预览 / Generator、Remotion 同步、素材 IPC、**LangChain Agent**；**视频导出**（`renderMedia`）与 **Remotion 工程 ZIP** |
| 渲染进程 | M4–M8 ✅ | 时间线编辑（含 **I/O 工作区**、图层条）、属性面板、**81 个 RVE 预设**、素材库、预览；**导出对话框**；右侧 **AI 助手** Tab |
| 预设系统 | ✅ | 单击查看 / 双击应用 / 拖到时间线；**全参数可编辑**（颜色、文案、数值等）；Agent `apply_preset` |
| 导出（M8） | ✅ | MP4/WEBM 渲染、进度与取消、默认导出至内容末尾；Remotion 工程 ZIP；`pnpm test:m8` |
| Legacy UI | 保留 | `apps/electron/src/renderer/legacy/`，`--legacy-ui` 或 `pnpm dev:legacy` |
| Python API | M0+ | FastAPI，`pnpm dev:all` 时一并启动 |
| 设计规范 | 文档 | [`docs/design-system/easymotion/MASTER.md`](docs/design-system/easymotion/MASTER.md) |
| **下一步 M9** | 计划 | E2E、性能优化、`electron-builder` 打包与发布准备 |

打开项目后会自动启动 Remotion 预览；时间线 JSON 驱动 `MainSequence` 动态渲染（含预设 `props`）。手写 Remotion 项目支持「从 Remotion 读取」与时间线双向同步。

详细需求与里程碑见 [`docs/requirements/`](docs/requirements/)（含 [`UI布局与交互设计-优化版.md`](docs/requirements/UI布局与交互设计-优化版.md)、[`开发里程碑与路线图.md`](docs/requirements/开发里程碑与路线图.md)）。

## 环境要求

- **Node.js** 20+
- **pnpm** 9+（仓库指定 `packageManager`: pnpm@10）
- **Python** 3.11+（仅 `dev:all` / 后端调试需要）

## 启动

```bash
pnpm install
python -m pip install -r apps/python/requirements.txt   # 首次或更新依赖后

pnpm dev          # Vite (127.0.0.1:5173) + Electron — 日常 UI 开发
pnpm dev:all      # 上述 + Python（8000 被占用时自动试 8001–8019）
```

**AI 助手（M5）**：可在应用内 **AI 助手 → 齿轮设置** 配置 LLM（Key 加密存于 `~/.easymotion/secrets.json`）。开发后备：复制 `apps/electron/.env.example` 为 `.env` 并填写 `ANTHROPIC_API_KEY`。

| 命令 | 作用 |
|------|------|
| `pnpm dev:renderer` | 仅 Vite |
| `pnpm dev:electron` | 等 5173 就绪后启动 Electron |
| `pnpm dev:legacy` | 旧版 HTML 调试页（在 `apps/electron` 包内） |
| `pnpm lint` / `lint:fix` | ESLint |
| `pnpm format` / `format:check` | Prettier（`apps` / `packages` / `.vscode` 等，不含 `docs/`） |
| `pnpm test` | 主进程脚本测试（m1 / m2 / m3 / m5） |
| `pnpm --filter @easymotion/electron test:m8` | M8 导出预检、I/O 工作区、工程 ZIP 打包 |
| `pnpm --filter @easymotion/electron test:m5.2` | M5.2 Remotion Code Agent 沙箱与读写工具 |

开发模式下 Electron 加载 **`http://127.0.0.1:5173`**（Vite 固定 IPv4，避免 Windows 上 `localhost` 仅 IPv6 导致连不上）。

### 预设相关脚本（`apps/electron`）

| 命令 | 作用 |
|------|------|
| `pnpm vendor:rve-presets` | 从 RVE 模板 vendoring 81 个预设组件 |
| `pnpm generate:preset-thumbnails` | 生成预设缩略图 |
| `node scripts/test-preset-parameters.js` | 校验预设参数注册表 |

## 仓库结构（简）

```
apps/electron/     # 主进程、preload、React 渲染进程（shadcn/ui + Tailwind）、Remotion 模板
apps/python/       # FastAPI
packages/shared/   # 共享类型与 timeline 工具
docs/requirements/ # 产品与技术需求
docs/design-system/# 设计 Token（权威）
docs/images/       # README 等文档用截图
.vscode/           # 团队共享的 F5 调试配置（见 .gitignore 白名单）
```

## VS Code / Cursor 调试（F5）

| 配置 | 用途 |
|------|------|
| **EasyMotion: Dev** | 推荐：自动确保 Vite → 启动 Electron（主进程断点） |
| **EasyMotion: Dev + React 断点** | 同上，并附加 React 渲染进程断点 |
| **EasyMotion: Full Stack** | Python FastAPI + Electron |
| **React: Vite (Chrome)** | 仅调试渲染层，不启动 Electron |
| **Remotion Preview (attach)** | 附加到 Remotion Vite（先 F5 打开项目并等预览启动；F5 时输入日志里的端口与项目 `remotion` 目录） |
| **Python: FastAPI** | 单独调试后端（端口 8001） |

任务面板：**`pnpm: dev`** / **`pnpm: dev:all`** / **`pnpm: test`**。旧版 HTML UI 用 `pnpm dev:legacy`（在 `apps/electron`）。

### 常见问题

1. **F5 任务报错 `Out-Null -Command`**  
   已用 `terminal.integrated.automationProfile` 与交互式终端配置分离。修改 `.vscode/settings.json` 后请 **重新加载窗口** 再 F5。

2. **5173 端口被占用**  
   结束残留的 `node`/Vite 进程，或只保留一个 dev 实例。F5 的 `ensure-vite-for-debug` 会复用已运行的 Vite。

3. **Electron 安装失败**  
   执行 `pnpm approve-builds` 批准 `electron` 构建脚本后，再 `pnpm install`。

4. **Remotion 预览断点不命中**  
   预览端口可能是 5174–5193（非固定 5174）。用 **Remotion Preview (attach)** 时按启动日志填写端口；`webRoot` 填当前打开项目下的 `subprojects/default/remotion`（不是仓库里的模板路径）。

5. **终端中文乱码**  
   工作区已配置 UTF-8 相关环境变量；避免在 UTF-8 终端里对 `concurrently -k` 连按 Ctrl+C（易触发 GBK 批处理提示乱码）。

## Windows：Electron 首次安装

```bash
pnpm approve-builds   # 交互批准 electron
pnpm install
pnpm dev
```

## 渲染进程 UI（shadcn/ui）

组件位于 `apps/electron/src/renderer/src/components/ui/`，配置见 `apps/electron/components.json`。新增组件：

```bash
cd apps/electron
npx shadcn@latest add <component>
```

主题 token 与 `em-*` 别名见 [`docs/design-system/easymotion/MASTER.md`](docs/design-system/easymotion/MASTER.md)；已安装列表见 [`docs/requirements/组件库清单.md`](docs/requirements/组件库清单.md)。

## 协作者

- 主文档入口：本 README + [`docs/requirements/开发者README.md`](docs/requirements/开发者README.md)
- AI Agent Harness：[`AGENTS.md`](AGENTS.md)
- 勿提交：`.env`、`node_modules/`、`.venv/`、构建产物；`.vscode` 仅提交 `launch.json` / `tasks.json` / `settings.json` / `extensions.json`
- 可选提交：`.cursor/skills/`（本地 Agent 技能）；其余 `.cursor/` 状态已忽略
