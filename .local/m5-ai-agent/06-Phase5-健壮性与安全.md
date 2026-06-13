# Phase 5 — 健壮性与安全

**工期**：2 天  
**依赖**：Phase 4  
**PR**：`feat/m5-agent-resilience`

## 目标

满足验收 **A4**、**A5**；对齐 [技术规格.md](../../docs/requirements/技术规格.md) Agent 降级与安全设计。

## 任务清单

### 超时与重试（A4）

- [ ] `llm-service`：首包 90s 超时 → 自动重试 1 次
- [ ] 两次失败 → `fallback-templates.js` 简化模式：
  - 解析用户文本是否含「标题/Hello」等关键词
  - 硬编码 `createTrack(text)` + `createClip` 基础淡入
- [ ] UI：system 消息「已进入简化模式，仅生成基础文字动画」

### 代码安全（A5）

- [ ] Generator 写入前扫描生成 TSX：
  - 禁止 `require('fs')`、`child_process`、`eval`、`Function(`
  - 禁止非白名单 import
- [ ] 违规 → 拒绝写入 + `E2xxx` + 提示用户重试
- [ ] 单元测试覆盖典型恶意片段

### 错误与并发

- [ ] 流中断 → `E2810`，UI toast + 消息内 `[错误]`
- [ ] 新 `conversation:send` 自动 `cancel` 上一个 LLM 请求（IPC 规范）
- [ ] `AgentStatusBar` 显示 `error` 态 + 重试按钮

### 取消

- [ ] UI 停止按钮 → `main:conversation:cancel` + `main:llm:cancel`
- [ ] 取消后 Agent 不写入 partial timeline

## 验收

- [ ] 断网 / 无效响应：明确错误，不 corrupt timeline
- [ ] 简化模式至少能生成 Hello 标题
- [ ] 含 `fs` 的生成结果被拦截

## 错误码

对齐 [错误码统一字典.md](../../docs/requirements/错误码统一字典.md)：

| 码 | 场景 |
|----|------|
| E2700 | 消息发送失败 |
| E2701 | conversation 文件损坏 |
| E2800 | LLM 未知错误 |
| E2804 | API Key 无效 |
| E2810 | 流式中断 |
