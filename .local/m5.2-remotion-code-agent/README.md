# M5.2 — Remotion Code Agent（用户项目内改 Remotion 源码）

> 执行计划对齐 [`docs/requirements/`](../../docs/requirements/) 与 [M5 Agent 基线](../m5-ai-agent/README.md)。  
> 基线日期：2026-06-24 | 预估工期：2–3 周（可分 PR 交付）

## 目标（一句话）

让**应用内 AI 助手**能读写**用户打开的 `.em` 项目**下的 Remotion 源码（`{projectPath}/{subprojectPath}/remotion/`），实现「随意生成自定义动画」；**不修改 EasyMotion 软件 monorepo 给用户用**。

## 与 M5 的关系

| 模块 | M5（已完成） | M5.2（本计划） |
|------|-------------|----------------|
| 改 timeline JSON | ✅ 10 个 Tool | 保留，简单编辑仍走 timeline |
| 改 Remotion TSX | ❌ | ✅ 新增 Remotion Code Tools |
| 作用路径 | 用户 `subproject.json` | 用户 `remotion/src/**` |
| EasyMotion 源码 | 不碰 | 不碰（只在 monorepo 里**实现**本功能） |

## 阅读顺序

| 步骤 | 文档 |
|------|------|
| 1. 背景与边界 | [00-概述与目标.md](./00-概述与目标.md) |
| 2. 架构与沙箱 | [01-架构与沙箱边界.md](./01-架构与沙箱边界.md) |
| 3. 工具与 Prompt | [02-工具清单与Prompt.md](./02-工具清单与Prompt.md) |
| 4. 分阶段实现 | [03-实现阶段.md](./03-实现阶段.md) |
| 5. 文件与 PR | [04-文件清单与PR拆分.md](./04-文件清单与PR拆分.md) |
| 6. 验收测试 | [05-验收与测试.md](./05-验收与测试.md) |
| 7. 风险排期 | [06-风险与排期.md](./06-风险与排期.md) |
| 8. **Remotion 文档审查** | [07-Remotion官方文档对齐审查.md](./07-Remotion官方文档对齐审查.md) |

## 权威规范（必读）

| 文档 | 用途 |
|------|------|
| [代码生成规范.md](../../docs/requirements/代码生成规范.md) | TSX 结构、Layer、安全白名单 |
| [LLM-Agent设计.md](../../docs/requirements/LLM-Agent设计.md) | Agent 工作流、Tool 模式 |
| [AGENTS.md](../../AGENTS.md) | Cursor 开发 Harness |
| [docs/agent-eval/tasks.json](../../docs/agent-eval/tasks.json) | Timeline Agent eval（M5.2 另增 code eval） |

## 测试入口

```bash
cd apps/electron && pnpm test:m5.2    # 沙箱 + code eval (rc-01..rc-06) + router
node scripts/test-remotion-code-agent-live.js   # 待建：需 API Key live 冒烟
```

**M5.2 状态**：Phase 1–3 ✅ 全部完成（2026-06-24）

## 与 `docs/` 的关系

- `docs/requirements/`：**权威规范**（M5.2 落地后应回写 LLM-Agent设计 §工具列表）
- `.local/m5.2-remotion-code-agent/`：**执行排期与进度快照**
