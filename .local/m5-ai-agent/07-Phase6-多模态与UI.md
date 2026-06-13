# Phase 6 — 多模态与 UI 完善

**工期**：3 天（P2，可延后）  
**依赖**：Phase 5  
**PR**：`feat/m5-multimodal`

## 目标

满足验收 **A6**；补齐对话面板体验缺口。

## 任务清单

### 图片上传

- [ ] `MessageInput.tsx` — 附件按钮、拖拽图片
- [ ] 主进程复制到 `assets/ai-refs/`（或子项目 `assets/images/`）
- [ ] `Message` 存 `attachedImages` 路径/id
- [ ] 消息气泡内缩略图预览

### 多模态 LLM

- [ ] `llm-service` 支持 vision content block（Anthropic / OpenAI 格式）
- [ ] Agent 视觉解析 Prompt（[LLM-Agent设计.md](../../docs/requirements/LLM-Agent设计.md) §视觉解析）
- [ ] layout JSON → `createTrack` / `createClip` 参数映射

### 系统消息与快捷操作

- [ ] `role: system` — 执行进度、降级、错误通知
- [ ] Assistant 消息 `actionButtons`：「重新生成」「查看时间线变更」
- [ ] `GenerationProgress` 组件（可选，骨架 + 状态文案）

### UI  polish（非 BottomBar）

- [ ] 空状态示例指令可点击填充
- [ ] 流式时禁用输入 + 停止按钮
- [ ] 新手引导：首次打开 AI Tab 提示（对齐 UI 设计 §7.3，可简化）

## 验收（A6）

- [ ] 上传布局参考图 + 「按这个布局做标题」→ 位置/颜色大致合理
- [ ] 多图时按上传顺序传给 LLM

## 降级策略

多模态不稳定时（路线图风险表）：

- UI 仍支持上传，但 Prompt 强调用户**文字描述**布局
- 视觉解析失败 → 仅文字 Agent 路径，system 提示「未能解析图片，请补充描述」

## 明确不做

- 图片缩略图拖拽重排序（可 M5.1）
- 底部 `BottomConversationBar` 全展开态
