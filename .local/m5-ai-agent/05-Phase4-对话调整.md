# Phase 4 — 对话调整

**工期**：3 天  
**依赖**：Phase 3  
**PR**：`feat/m5-agent-modify`

## 目标

满足验收 **A2**：对已有元素进行自然语言微调。

## 任务清单

### 上下文传递

- [ ] `main:conversation:send` 附带 `selectedClipId`、`selectedTrackId`
- [ ] 无选中时：Agent 用 `queryElement` 匹配「标题」「文字」等描述
- [ ] System Prompt 注入当前选中 clip 的 JSON 摘要

### updateClip 增强

- [ ] 支持相对调整规则（[LLM-Agent设计.md](../../docs/requirements/LLM-Agent设计.md) §参数调整 Prompt）：
  - 「大一点/小一点」→ 数值 ±20%
  - 「快一点/慢一点」→ `durationInFrames` 减半/加倍
  - 「移到左边/右边」→ position 偏移
  - 「颜色改成 xxx」→ 映射 hex

### 冲突检测

- [ ] 目标 clip `lastModifiedBy === "user"` 且手动编辑在 5 分钟内 → UI 确认「AI 将覆盖手动修改」
- [ ] 用户取消则 Agent 中止或仅回复建议不写入

### UI

- [ ] `MessageItem.tsx` — 区分 user / assistant / system 样式
- [ ] Assistant 消息可选「撤销此次 AI 修改」（单步 revert 或调 timeline undo）
- [ ] 展示修改摘要：`fontSize: 96 → 115`

## 验收（A2）

- [ ] 选中文字 clip，输入「字体大一点」→ `style.fontSize` 增大 → 预览更新
- [ ] 未选中但存在唯一 text clip 时，同指令仍生效
- [ ] 手动刚改过的 clip，AI 修改前弹出确认

## Prompt 回归用例（建议固定 10 条）

| 输入 | 期望 |
|------|------|
| 字体大一点 | fontSize ×1.2 |
| 颜色改成红色 | color → #FF0000 或近似 |
| 淡入时间长一点 | animations.in.durationInFrames 增加 |
| 移到画面中央 | position 约 (width/2, height/2) |
| 删除这个标题 | deleteClip |
