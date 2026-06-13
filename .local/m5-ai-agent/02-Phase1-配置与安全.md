# Phase 1 — 配置与安全

**工期**：2 天  
**依赖**：Phase 0  
**PR**：`feat/m5-settings-secrets`  
**可与 Phase 2 并行**

## 目标

脱离开发 `.env` 明文 Key，对齐 [技术规格.md](../../docs/requirements/技术规格.md) §LLM API Key 存储。

## 任务清单

### 主进程

- [ ] `services/settings-service.js` — 读写 `~/.easymotion/settings.json`
- [ ] `services/secrets-service.js` — `app.safeStorage` 加密 API Key → `secrets.json`
- [ ] `ipc-handlers/settings.js` — `main:settings:get`、`update`、`validateLLMKey`
- [ ] 改造 `llm-service.js`：
  - 从 secrets 读 Key（`.env` 仅作 dev fallback）
  - 抽象 `LlmProvider`：`anthropic` | `openai`
  - 请求参数支持 `provider`、`model`（对齐 IPC 规范）

### 渲染进程

- [ ] `components/ai/LLMSettingsDialog.tsx` — 提供商、Base URL、Model、API Key
- [ ] AI Tab 顶部齿轮入口；首次无 Key 时引导打开
- [ ] 类型：`types/settings.ts`

### 配置字段（最小集）

```json
{
  "llm": {
    "provider": "anthropic",
    "baseUrl": "https://api.minimaxi.com/anthropic",
    "model": "MiniMax-M3",
    "maxTokens": 4096,
    "temperature": 0.7
  }
}
```

## 验收

- [ ] Key 不出现在项目目录与 git 历史
- [ ] 设置保存后重启仍有效
- [ ] 无效 Key → `validateLLMKey` 返回 false + `E2804`
- [ ] 开发模式仍可用 `.env`（document in `.env.example`）

## 参考

- [配置管理参考.md](../../docs/requirements/配置管理参考.md) — `secrets.json` 结构
- [IPC通信协议规范.md](../../docs/requirements/IPC通信协议规范.md) §7 设置领域
