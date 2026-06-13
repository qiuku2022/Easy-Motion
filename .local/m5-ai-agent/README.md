# M5 — AI 对话面板 + Agent 集成

> 本地执行计划：把 [`docs/requirements/开发里程碑与路线图.md`](../../docs/requirements/开发里程碑与路线图.md) M5 落成可交付功能。  
> 基线日期：2026-06-13 | 预估工期：3 周

## 当前进度

| 模块 | 状态 | 说明 |
|------|------|------|
| LLM 流式代理 | 🟡 本地未提交 | `llm-service.js` + IPC + 聊天 UI |
| 对话持久化 | ⬜ 未开始 | `conversation.json` |
| Agent + 时间线工具 | ⬜ 未开始 | 核心闭环 |
| 设置 / Key 安全 | ⬜ 未开始 | `secrets.json` + 设置面板 |
| 多模态 | ⬜ 未开始 | P2，可放最后 |

**整体约 15–20%**（仅「能聊天」，不能改时间线）。Phase 0 基线已合入 `main`（LLM IPC + 聊天 UI + `.env.example`）。

## 阅读顺序

| 步骤 | 文档 |
|------|------|
| 1. 背景与边界 | [00-概述与现状.md](./00-概述与现状.md) |
| 2. 分阶段实施 | [01-Phase0](./01-Phase0-合入基线.md) → [07-Phase6](./07-Phase6-多模态与UI.md) |
| 3. 工程落地 | [08-文件清单与PR拆分.md](./08-文件清单与PR拆分.md) |
| 4. 排期与风险 | [09-排期分工与风险.md](./09-排期分工与风险.md) |
| 5. 完成定义 | [10-验收与测试.md](./10-验收与测试.md) |

## 权威规范（对外）

| 文档 | 用途 |
|------|------|
| [开发里程碑与路线图.md](../../docs/requirements/开发里程碑与路线图.md) | M5 交付物与验收标准 |
| [LLM-Agent设计.md](../../docs/requirements/LLM-Agent设计.md) | Prompt、工具定义、工作流 |
| [IPC通信协议规范.md](../../docs/requirements/IPC通信协议规范.md) | `conversation` / `llm` / `settings` 域 |
| [状态管理详细设计.md](../../docs/requirements/状态管理详细设计.md) | `conversationStore` |
| [技术规格.md](../../docs/requirements/技术规格.md) | API Key 加密、Agent 降级 |
| [UI布局与交互设计-优化版.md](../../docs/requirements/UI布局与交互设计-优化版.md) | AI Tab、新手引导 |

## 与 `docs/` 的关系

- `docs/requirements/`：**产品与技术规范**（长期维护）
- `.local/m5-ai-agent/`：**M5 执行计划**（阶段任务、PR 拆分、排期快照）；完成后以代码 + `docs/` 为准
