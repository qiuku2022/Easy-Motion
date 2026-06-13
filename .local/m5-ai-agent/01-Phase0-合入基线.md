# Phase 0 — 合入聊天骨架基线

**工期**：0.5 天  
**依赖**：无  
**PR**：`feat/m5-llm-chat-foundation`

## 目标

把朋友本地未提交的 LLM 聊天改动合入主线，作为 M5 后续 PR 的基线。

## 任务清单

- [x] 创建分支 `feat/m5`（或 `feat/m5-llm-chat-foundation`）
- [x] 提交现有改动：
  - `llm-service.js`、`ipc-handlers/llm.js`、`load-env.js`
  - `index.js`、`preload/index.js`
  - `AIAssistantPanel.tsx`、`RightPanel.tsx`、`easyMotion.ts`
- [x] 确保 `apps/electron/.env` 在 `.gitignore` 中
- [x] 新增 `apps/electron/.env.example`（无真实 Key，含 LLM 变量说明）
- [x] README 暂不标 M5 完成，可加一行「M5 进行中」

## 不包含

- Agent、时间线修改、conversation 持久化
- 设置面板

## 验收

- [ ] `pnpm dev` 启动后，AI Tab 可发送消息并流式显示回复
- [ ] 未配置 Key 时提示 `E2804`
- [ ] `pnpm lint` / CI 通过
- [ ] 仓库中无真实 API Key

## 评审要点

- IPC 命名与 [IPC通信协议规范.md](../../docs/requirements/IPC通信协议规范.md) §9 一致
- `load-env` 不覆盖已有 `process.env`
- 流式取消 `main:llm:cancel` 可用（UI 可后续接停止按钮）
