# Phase 2 — 对话持久化

**工期**：2 天  
**依赖**：Phase 0（可与 Phase 1 并行）  
**PR**：`feat/m5-conversation-persistence`

## 目标

实现 `conversation.json` 读写 + `conversationStore`，满足验收 **A3**。

## 任务清单

### 主进程

- [ ] `services/conversation-service.js`
  - `load(subprojectPath)` → 读 `subproject.json` 内 `conversation` 或独立 `conversation.json`（与 [项目管理.md](../../docs/requirements/项目管理.md) 路径一致）
  - `save(subprojectPath, conversation)` — 原子写入（复用 `file-service`）
- [ ] `ipc-handlers/conversation.js`
  - `main:conversation:load`
  - `main:conversation:save`
  - `main:conversation:clear`（可选）

### 渲染进程

- [ ] `stores/conversationStore.ts` — 对齐 [状态管理详细设计.md](../../docs/requirements/状态管理详细设计.md) §3
- [ ] `types/conversation.ts` — `Message`、`Conversation`、`AgentTask`
- [ ] 重构 `AIAssistantPanel`：消息状态迁入 store
- [ ] `projectStore` / 子项目切换时 `loadConversation`
- [ ] 发消息 / 流式结束后 debounce `saveConversation`

### 数据结构

```typescript
interface Conversation {
  messages: Message[];
  lastAgentTaskId?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  attachedImages?: string[];
}
```

与模板 `subproject.json` 已有 `conversation.messages: []` 对齐。

## 验收

- [ ] 发消息后关闭项目再打开，历史仍在
- [ ] 切换子项目，对话历史独立
- [ ] 文件损坏时返回 `E2701`，UI 提示并可清空重建
- [ ] 切换 Tab 不丢内存 state（RightPanel 已 keep-alive）

## 注意

此阶段仍可直接调 `llm:stream`；Phase 3 再切到 `conversation:send`。
