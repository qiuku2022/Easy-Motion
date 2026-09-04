# EasyMotion — Agent Guide

EasyMotion 是 Electron + React + Remotion + LangChain 的 Windows 桌面动画应用，采用 pnpm monorepo。

## 工作方式

- 使用简体中文，结论先行；不确定时明确说明，不猜测。
- 动手前搜索代码与相关文档；保持最小 diff，不改无关文件。
- WIP=1：一次只处理一个功能子项或一个 bug。
- 仓库内读取、修改和验证可直接执行；push、PR、生产 API 等外部操作先确认。
- 未运行对应验证时，不得声称“已完成”或“测试通过”。

## 目录与进程边界

| 范围                        | 路径                              |
| --------------------------- | --------------------------------- |
| Electron 主进程、IPC、Agent | `apps/electron/src/main/`         |
| Preload API                 | `apps/electron/src/preload/`      |
| React、Zustand、UI          | `apps/electron/src/renderer/src/` |
| 共享 timeline 逻辑          | `packages/shared/`                |
| Python FastAPI              | `apps/python/`                    |
| 产品与技术文档              | `docs/requirements/`              |

- Renderer 禁止使用 Node/`fs` 或导入主进程模块；文件与系统能力必须经 IPC。
- 新增 IPC 必须同步 handler、preload 和 `renderer/src/types/easyMotion.ts`；通道命名用 `main:<domain>:<action>`。
- Timeline JSON 是动画内容的权威数据；预览由动态 `MainSequence` 驱动，不要把手改生成 TSX 当默认方案。
- 改 timeline 数据模型时，同步 `packages/shared` 校验、`timeline-ops.js`、Agent tool schema 和 renderer types。
- 改预设时，同步 manifest、Agent preset catalog 和属性面板参数。

## 开发约定

- 主进程使用 CommonJS；Renderer 使用 TypeScript + React；Python 以 3.11 为基线。
- 使用 pnpm workspace；Electron 依赖通过 `pnpm --filter @easymotion/electron add <pkg>` 添加。
- UI 使用 shadcn/ui + Tailwind；token 权威在 `apps/electron/tailwind.config.js` 与 `apps/electron/src/renderer/src/index.css`。
- API Key 仅存应用设置或本地 `.env`，不得提交密钥。
- 错误码遵循 `docs/requirements/错误码统一字典.md`。

## 代码质量红线

- 修改前先查找同类实现、调用链和现有测试；优先复用，禁止新增第二套状态源、协议或重复工具函数。
- 保持职责边界：React 组件负责展示与交互；Zustand store 负责状态编排和副作用；timeline 计算与变换放 `renderer/src/lib/timeline/` 的纯函数；IPC handler 只做校验和转发，业务放 service。
- 依赖只能按 Renderer → Preload → Main 流动；跨层共享领域逻辑放 `packages/shared/`，禁止反向或跨层导入。
- 超过 500 行的生产文件不得继续加入新职责；新增能力拆到同目录的领域模块，原文件只保留组合、注册或调用。生成物、类型声明和静态数据表除外。
- `agent/tools/index.js` 只做工具聚合；新增 Agent tool 按领域拆分。`timelineStore.ts` 只做状态编排；新增 timeline 变换必须写成可独立测试的纯函数。
- 不为“以后可能复用”创建抽象；只有存在两个真实调用方，或需要隔离可独立测试的领域规则时，才提取公共层。
- 禁止新增 `any`、`@ts-ignore`、无原因的 lint 禁用、空 `catch` 和静默 fallback；确需例外时必须写明局部原因。
- 修改 IPC、timeline schema、preset 参数或持久化结构时，必须保持兼容，或同时提供迁移和回归测试。
- 修 bug 必须增加能复现问题的回归测试；行为变更必须覆盖成功、失败和边界路径。没有可运行测试入口时，在结果中明确说明。
- 完成前检查 diff 并运行对应验证；必须列出已运行、未运行以及已有失败，不得把“代码已写”表述为“验证通过”。

改功能前读取对应的 `docs/requirements/` 文档。重点入口：

- Remotion / timeline：`时间线编辑.md`、`代码生成规范.md`
- 产品 Agent：`LLM-Agent设计.md`
- UI：`UI布局与交互设计-优化版.md`、`组件库清单.md`、`可访问性设计.md`
- 打包：`构建与部署.md`

## 验证

| 改动                       | 必跑                                                               |
| -------------------------- | ------------------------------------------------------------------ |
| 任意 JS/TS                 | `pnpm lint`                                                        |
| Renderer TS/TSX            | `pnpm typecheck`                                                   |
| Renderer timeline 纯函数   | `pnpm --filter @easymotion/electron test:renderer`                 |
| 主进程 / Agent / Generator | `pnpm test`                                                        |
| 仅 Agent                   | `pnpm --filter @easymotion/electron test:m5`                       |
| Agent memory               | `pnpm --filter @easymotion/electron test:m12`                      |
| 预设 manifest / 参数       | `cd apps/electron && node tests/test-preset-parameters.js`         |
| 仅 UI 样式                 | `pnpm lint` + `pnpm dev` 目视检查                                  |
| 打包路径                   | `pnpm build:win` 或 `pnpm --filter @easymotion/electron build:dir` |
| Python bundle              | `pnpm build:python`                                                |
| 跨层改动或完整回归         | `pnpm check`                                                       |
| 发布前导出与真实渲染       | `pnpm test:release`                                                |
| 真实 LLM（可能产生费用）   | `pnpm test:live`                                                   |

开发入口见 `README.md`；架构、IPC 和里程碑以 `docs/requirements/` 中的现役文档为准。
