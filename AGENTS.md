# EasyMotion — Agent Harness

> 本文件是 AI 编码 Agent（Cursor、Codex、Claude Code 等）在本仓库中的**持久化约束层**。
> 原则：**人类设计环境与反馈回路，Agent 执行。** 每次 Agent 重复犯错，应把修复写回此文件或对应测试。

## 工作原则

### 严谨第一

- 不猜测，不编造。
- 不确定的事情说清楚不确定在哪里。
- 结论先行，论证跟上。

### 先搜后答

- 遇到问题不着急回答或动手，先去搜索 codebase / 文档 / 相关上下文。
- 多搜几条，结合实际情况分析后再回答或开始。

### 善于思考

- 遇到问题先拆解，给出思路再给答案。
- 问题复杂时，说清楚推理过程。

### 高效沟通

- 用简体中文回复。
- 废话少说，重点突出；长内容结构化呈现。

### 主动但不越界

- 能自己查到的不问，该确认的先确认。
- 内部操作（读代码、跑 lint/test、改仓库内文件）大胆做；外部操作（push、发 PR、调生产 API 等）先请示。

### 有判断力

- 对方案有偏好，能说出为什么。
- 不当应声虫，但尊重最终决策。

### 善用 Skills

- 改 Remotion / UI / 视觉相关代码前，先读 `.cursor/skills/`、`.agents/skills/` 下对应 `SKILL.md`。
- Skill 是项目内沉淀的操作指南，优先级高于通用经验；读了再写，不要边写边猜。

### 善用 MCP

- 需要实时检索、外部信息时，优先用 Tavily MCP，可直接调用。
- 调用前必读 tool 描述与参数 schema；参数不确定时先查文档，不瞎传。
- Open Design 等非常驻 MCP 不要默认假设可用；MCP 能力不足时如实说明限制，不要假装已完成。

## 项目概览

EasyMotion 是用自然语言制作 Remotion 动画的 **Electron 桌面应用**（monorepo）。

| 层级 | 路径 | 职责 |
|------|------|------|
| Electron 主进程 | `apps/electron/src/main/` | IPC、项目/时间线/预览/Generator、LangChain Agent |
| Preload | `apps/electron/src/preload/` | `contextBridge` 暴露 `window.easyMotion` |
| 渲染进程 | `apps/electron/src/renderer/src/` | React 18 + shadcn/ui + Zustand + 时间线 UI |
| 共享包 | `packages/shared/` | timeline 校验与工具函数 |
| Python API | `apps/python/` | FastAPI（爬虫/数据处理，非核心路径） |
| 需求文档 | `docs/requirements/` | 产品与技术规格（改功能前先读相关文档） |
| 设计规范 | `docs/design-system/easymotion/MASTER.md` | UI token 与 `em-*` 别名（权威） |

**数据流核心：** 时间线 JSON → Generator（可选）→ Remotion 预览。预设走 `animation` 轨道 + `source.component` + `source.props`，多数场景由 timeline 动态驱动 `MainSequence`，**不必每次改参都重新生成 TSX**。

**里程碑（2026-06-27）：** M0–M8 ✅；**M9 进行中**——Windows NSIS 打包已通（`pnpm build:win`），E2E / 签名 / macOS·Linux 待建。详见 [`开发里程碑与路线图.md`](docs/requirements/开发里程碑与路线图.md)、[`构建与部署.md`](docs/requirements/构建与部署.md)。

## WIP=1：一次只做一件事

- 单次任务只改**一个里程碑子项**或**一个 bug**，不要跨模块大重构。
- 改完必须跑对应验证（见下方「改完必跑」），通过后再进入下一项。
- 不要同时改 Legacy UI（`apps/electron/src/renderer/legacy/`）与新 UI，除非任务明确要求。

## 进程边界（严禁越界）

```
渲染进程 (React)  ──IPC──►  主进程 (Node)  ──spawn──►  Remotion 预览 / Python
     │                           │
  不可 require('fs')         不可直接操作 DOM
  不可 import 主进程模块      Agent / Generator 在此运行
```

| 要做的事 | 正确位置 |
|----------|----------|
| UI 组件、Zustand store | `apps/electron/src/renderer/src/` |
| IPC handler、服务、Agent | `apps/electron/src/main/` |
| 暴露给渲染层的 API | `apps/electron/src/preload/index.js` + `renderer/src/types/easyMotion.ts` |
| 跨层共享逻辑 | `packages/shared/` |
| Remotion 组件 / 预设 | 项目内 `subprojects/*/remotion/` 或 vendored `renderer/public/presets/` |

**IPC 通道命名：** `main:<domain>:<action>`（如 `main:timeline:save`、`conversation:send`）。新增通道必须同时改 preload、类型定义、handler 注册。

## 强耦合模块：改前必读

以下模块联动，改一处常需验证整条链：

1. **时间线 UI** ↔ **timeline JSON schema** ↔ **Agent tools**（`apps/electron/src/main/agent/`）
2. **Generator**（`apps/electron/src/main/generator/`）↔ **Remotion MainSequence**
3. **预设 manifest**（`renderer/src/data/presets/manifest.json`）↔ **Agent preset-catalog** ↔ **属性面板参数**
4. **对话面板** → Agent → timeline 变更 → 预览刷新

改 timeline 数据模型时：同步 `packages/shared` 校验、`timeline-ops.js`、Agent tools schema、渲染进程 types。

## 改完必跑（按改动范围）

| 改动范围 | 命令（仓库根目录） |
|----------|-------------------|
| 任意 JS/TS | `pnpm lint` |
| 主进程 / Agent / Generator | `pnpm test` |
| 仅 Agent 相关 | `pnpm --filter @easymotion/electron test:m5` |
| 预设 manifest / 参数 | `cd apps/electron && node scripts/test-preset-parameters.js` |
| 仅 UI（无逻辑） | `pnpm lint`；手动 `pnpm dev` 目视检查 |
| 打包 / electron-builder / 安装包路径 | `pnpm build:win`（或 `pnpm --filter @easymotion/electron build:dir`）；手测 `release/win-unpacked/EasyMotion.exe` |
| Python bundle / 打包态 Python 启动 | `pnpm build:python`；安装包内验证 FastAPI 子进程 |
| 格式化（提交前可选） | `pnpm format:check` |

**不要**在未跑测试的情况下声称「已完成」或「通过验证」。

## 编码约定

- **语言：** 主进程 CommonJS（`require`）；渲染进程 TypeScript + React；Python 3.11+
- **包管理：** pnpm workspace，改依赖用 `pnpm --filter @easymotion/electron add ...`
- **UI：** shadcn/ui + Tailwind；新组件 `cd apps/electron && npx shadcn@latest add <name>`
- **状态：** Zustand；跨面板状态勿随意提升到主进程
- **错误码：** 遵循 `docs/requirements/错误码统一字典.md`（E1xxx–E9xxx）
- **注释：** 只写非显而易见的业务逻辑；不要加叙述性注释
- **范围：** 最小 diff，不改无关文件；**不要**改 `docs/` 除非任务涉及文档

## Agent（产品内 AI 助手）开发须知

产品 Agent 位于 `apps/electron/src/main/agent/`：

- **图：** `graph.js` — LangChain `createAgent` + tools + system prompt
- **工具：** `tools/index.js` — 10 个 timeline 工具（createTrack、applyPreset 等）
- **Prompt：** `prompts/system.js` — 修改后跑 `test-agent-prompt-regression.js`
- **安全：** Generator 输出经 `generator/security-scan.js`（禁止 eval/require 等）

规则（与 system prompt 一致，改 prompt 时保持同步）：

- 文字标题用 `type: "text"` 轨道，非必要不用 `group`
- 内置动效用 `listPresets` + `applyPreset`，不要猜 RVE 组件名
- 改已有元素前先 `queryElement`；禁止虚假「已完成」回复
- 渐变背景：`shape` 轨道 + 全屏 rect + `style.background: linear-gradient(...)`

M5.2 Remotion Code Agent：**已完成**（`a1fa91a`）。详见 [`docs/requirements/LLM-Agent设计.md`](docs/requirements/LLM-Agent设计.md)；测试：`pnpm test:m5.2`。

## Cursor Skills（开发侧）

| Skill | 路径 | 何时读 |
|-------|------|--------|
| Remotion 最佳实践 | `.agents/skills/remotion-best-practices/SKILL.md` | 改 Remotion 组件、预设、渲染逻辑 |
| UI/UX | `.cursor/skills/ui-ux-pro-max/SKILL.md` | 改布局、视觉、交互 |
| Frontend Design | `.cursor/skills/frontend-design/SKILL.md` | 新建或重塑 UI 视觉方向 |
| Theme Factory | `.cursor/skills/theme-factory/SKILL.md` | 需要统一主题/配色/字体时 |

## 常见 Agent 错误 → 永久修复

| 错误 | 修复 |
|------|------|
| 在渲染进程 `require('fs')` 或调 Node API | 走 IPC / preload |
| 手改生成物 `MainSequence.tsx` 而非 timeline JSON | 改 timeline + 动态预览路径；Generator 仅用于导出/legacy |
| 新增预设未更新 manifest / 参数注册表 | 跑 `vendor:rve-presets` + `test-preset-parameters.js` |
| Windows 上 Electron 连不上 Vite | 用 `127.0.0.1:5173`，不用 `localhost` |
| 改 Agent tool 未改 Zod schema | tools 的 schema 与 `timeline-ops` 参数必须一致 |
| 提交 `.env` 或 API Key | Key 存 `~/.easymotion/secrets.json`；仅提交 `.env.example` |
| 安装包缺 `@langchain/core` 等 peer 依赖 | 在 `apps/electron/package.json` **显式声明**依赖；改完跑 `verify-packaged-deps.cjs` |
| 安装包预设缩略图空白 | 渲染层用 `import.meta.env.BASE_URL` 相对路径；构建前 `sync-preset-thumbnails.cjs`；勿用 `/presets/...` 绝对路径 |
| F5 / 启动报 `ENOENT path.txt`（Electron） | `pnpm --filter @easymotion/electron debug:prepare`；根 `package.json` 保留 `pnpm.onlyBuiltDependencies: ["electron","esbuild"]` |
| `build:python` 因 `PYTHONHOME` 失败 | 脚本内 `cleanHostPythonEnv()`；勿在 shell 遗留 Python 隔离变量 |
| 打包态读开发路径（templates / presets / Python） | 用 `apps/electron/src/main/utils/paths.js` 的 `get*Dir()`，区分 `app.isPackaged` |
| 安装包打开项目报 `Cannot find module .../scripts/process-utils.cjs` | 主进程运行时代码放 `src/main/`；`scripts/` 仅 dev 脚本，`process-utils` 在 `src/main/utils/process-utils.js` |

## 初始化检查（新 session / 新 Agent）

1. 读本文 + 任务相关的 `docs/requirements/` 文档
2. `pnpm install`（若 node_modules 缺失；Windows F5 异常见上表 `path.txt`）
3. 确认要改的子系统；**M9 打包任务**先读 [`构建与部署.md`](docs/requirements/构建与部署.md)

## 参考

- 开发者入口：[`docs/requirements/开发者README.md`](docs/requirements/开发者README.md)
- 里程碑：[`docs/requirements/开发里程碑与路线图.md`](docs/requirements/开发里程碑与路线图.md)
- 打包与部署：[`docs/requirements/构建与部署.md`](docs/requirements/构建与部署.md)
- IPC 规范：[`docs/requirements/IPC通信协议规范.md`](docs/requirements/IPC通信协议规范.md)
