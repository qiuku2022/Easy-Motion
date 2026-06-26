# `.local/` — 团队开发笔记

> 已纳入版本库，方便协作者了解 UI 迁移与主题焕新的背景、决策与实施记录。

## 目录

| 子目录 | 说明 |
|--------|------|
| [`shadcn-migration/`](./shadcn-migration/) | shadcn/ui 迁移计划、阶段清单与完成记录 |
| [`theme-refresh/`](./theme-refresh/) | 主题焕新研究（方案 A/B 对比、token 草案、实施清单） |
| [`m5-ai-agent/`](./m5-ai-agent/) | M5 AI 面板 + **LangChain Agent** 分阶段计划（对齐 `docs/requirements`） |
| [`m5.2-remotion-code-agent/`](./m5.2-remotion-code-agent/) | M5.2 **Remotion Code Agent** — 用户项目内读写 Remotion TSX（沙箱） |

## 从哪里读起

1. **刚接手 UI**：[`shadcn-migration/00-概述与原则.md`](./shadcn-migration/00-概述与原则.md) → [`shadcn-migration/11-迁移完成记录.md`](./shadcn-migration/11-迁移完成记录.md)
2. **改配色 / token**：[`theme-refresh/README.md`](./theme-refresh/README.md) → [`theme-refresh/02-推荐方案.md`](./theme-refresh/02-推荐方案.md)
3. **做 M5 AI / LangChain Agent**：[`m5-ai-agent/README.md`](./m5-ai-agent/README.md) → [LLM-Agent设计.md](../docs/requirements/LLM-Agent设计.md)
4. **做 M5.2 Remotion Code Agent**：[`m5.2-remotion-code-agent/README.md`](./m5.2-remotion-code-agent/README.md)
5. **权威规范**（对外文档）：[`docs/design-system/easymotion/MASTER.md`](../docs/design-system/easymotion/MASTER.md)

## 与 `docs/` 的关系

- `docs/requirements/`、`docs/design-system/`：**产品与技术规范**（长期维护）
- `.local/`：**执行过程笔记**（迁移步骤、临时对照、已落地决策的快照）；实施完成后以 `docs/` 与代码为准
