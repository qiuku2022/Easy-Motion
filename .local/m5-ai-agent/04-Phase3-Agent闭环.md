# Phase 3 — Agent 最小闭环（M5 核心）

**工期**：5 天  
**依赖**：Phase 1、Phase 2  
**PR**：`feat/m5-agent-create-text`

## 目标

打通验收 **A1**：自然语言 → 时间线变更 → Generator → 预览更新。

## 3.1 时间线工具层

新建 `apps/electron/src/main/agent/timeline-tools.js`：

| 工具 | 说明 | 复用 |
|------|------|------|
| `createTrack` | 新建轨道 | timeline mutate |
| `createClip` | 新建片段 | 参考 `placeAssetClip.ts` |
| `updateClip` | 更新属性（嵌套路径） | — |
| `deleteClip` | 删除片段 | — |
| `addKeyframe` | 添加关键帧 | — |
| `setAnimation` | 入场/出场动画 | — |
| `queryElement` | 按 id/name/类型查询 | — |
| `importAsset` | 导入素材 | `asset-service` |

每个工具返回 `{ success, data?, error? }`，供 Agent 顺序调用。

**M5 首版最小工具集**（可先实现 4 个再扩展）：

1. `createTrack`
2. `createClip`
3. `updateClip`
4. `queryElement`

## 3.2 Agent 编排器

新建 `apps/electron/src/main/agent/agent-service.js`：

```
用户消息 + 上下文（timeline 摘要、选中 clip、画布参数）
  → LLM（tools schema：Anthropic tool_use / OpenAI functions）
  → 顺序执行 tool calls（≤10 步）
  → timeline-service.save
  → generator + preview reload
  → assistant 消息 + 执行摘要
```

新建 `apps/electron/src/main/agent/prompts.js` — 按 [LLM-Agent设计.md](../../docs/requirements/LLM-Agent设计.md) 拼装 System Prompt。

### IPC

| 通道 | 方向 | 说明 |
|------|------|------|
| `main:conversation:send` | invoke | `{ content, images?, selectedClipId? }` |
| `renderer:conversation:chunk` | push | 流式文本 |
| `renderer:conversation:status` | push | `idle \| parsing \| executing \| generating \| done \| error` |
| `renderer:conversation:complete` | push | `{ timelineChanged, summary? }` |

渲染进程 **不再** 直接调 `main:llm:stream` 发用户消息（`llm:stream` 保留给 Agent 内部或调试）。

## 3.3 渲染进程联动

- [ ] `conversationStore.sendMessage` → `main:conversation:send`
- [ ] 订阅 `conversation:status` → `AgentStatusBar` 显示进度
- [ ] `complete` 且 `timelineChanged` → `timelineStore.loadTimeline()` + 已有预览刷新链
- [ ] Assistant 消息展示执行摘要（如「已创建 1 个文字轨道」）
- [ ] clip 写入时设 `lastModifiedBy: "ai"`

## 3.4 System Prompt 上下文

注入字段：

- `width × height`、`fps`、`durationInFrames`
- tracks 摘要（id、type、clip 数、首尾 clip 名称）
- `selectedClipId`（来自 UI）
- 8 工具说明 + 使用规则（见 LLM-Agent 设计 §工具调用）

## 验收（A1）

> 输入：「创建一个标题写着 Hello，带淡入效果」

- [ ] 时间线出现 `type: text` 轨道与 clip
- [ ] `source.content` 含 Hello
- [ ] `animations.in` 含 fade
- [ ] 预览自动刷新并显示效果
- [ ] 对话历史已持久化

## 演示脚本（手动 E2E）

1. 新建项目 → 打开 AI Tab
2. 发送上述指令
3. 检查时间线 + 预览 + `conversation.json`

## 技术备注

- 若 provider 不支持 tool_use：增加 **JSON Patch 兜底**（LLM 直接输出 timeline operations JSON）
- Generator 触发复用 `timelineStore.runGenerate` 现有路径
