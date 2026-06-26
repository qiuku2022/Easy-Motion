# EasyMotion 设计系统（Master）

> **权威来源**：与 `docs/requirements/UI布局与交互设计-优化版.md` v1.0 冲突时，以该文档为准。
> **页面覆盖**：若存在 `docs/design-system/easymotion/pages/[page].md`，则该页规则优先于本文。

---

## 颜色系统 — shadcn Neutral Dark（v1.1+）

> 2026-06 起壳层 UI 采用 [shadcn neutral `.dark`](https://ui.shadcn.com/docs/theming)。旧 Cinema Dark + Action Red 已弃用。

| 角色 | 感知 | Tailwind / CSS var |
| ---- | ---- | ------------------ |
| Background | 近 `#0a0a0a` 纯灰黑 | `bg-background` / `--background` |
| Card / Popover | 略抬升 `#171717` | `bg-card` / `bg-popover` |
| Border | 白 10% alpha | `border-border` |
| Text | 近白 | `text-foreground` |
| Muted text | 中灰 | `text-muted-foreground` |
| Primary button | 浅灰白实心 | `bg-primary`（**非**红色 CTA） |
| Focus ring | 中性灰 | `ring-ring` |
| Destructive | 红（仅删除/错误） | `text-destructive` / `bg-destructive/10` |
| Warning | 琥珀 | `text-warning` |

**主题**：`<html>` 上使用 shadcn `.dark`；v1.0 仅交付暗色。

Token 源文件：`apps/electron/src/renderer/src/index.css`（oklch）。`em-*` 别名仍映射同一变量（过渡期）。

| 语义类 | `em-*` 别名 |
| ------ | ----------- |
| `bg-background` | `bg-em-bg` |
| `bg-muted` / `bg-accent` | `bg-em-surface` / `bg-em-elevated` |
| `border-border` | `border-em-border` |
| `text-foreground` / `text-muted-foreground` | `text-em-text` / `text-em-muted` |
| `bg-primary` | `bg-em-accent` |
| `ring-ring` | `text-em-teal`（色相已中性化） |

时间线画布可保留局部 accent 色；壳层按钮以 `ghost` / `outline` 为主，`default` 仅极少数 CTA。

**预览舞台** `--preview-canvas`：`oklch(0.085 0 0)`（≈ `#121212`），比 `--background` 更深、无紫调，用于 `PreviewWindow` 与 Remotion `preview.html` 衬底。

---

## 字体

| 角色 | 字体 | 字重 |
| ---- | ---- | ---- |
| UI | Plus Jakarta Sans | 400, 500, 600 |
| Mono | JetBrains Mono | 400 |

```css
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap");
```

字号：`text-xs` 12px → `text-2xl` 24px。

---

## 间距与圆角

- 间距：4 / 8 / 12 / 16 / 24px（`space-1` … `space-6`）
- 圆角：`rounded-lg` 8px（`--radius-overlay`）用于**按钮**与**输入框**；`rounded-md` 4px（`--radius-control`）用于菜单项 / Tab；`rounded-sm` 3px 仅用于时间线画布

---

## 组件（token 约定）

- **主按钮**：shadcn `Button variant="default"` → `bg-primary text-primary-foreground`（浅灰白）；**圆角 `rounded-lg`（8px）**，与 Input 一致（`button.tsx` 已自定义，升级 shadcn 时需保留）
- **次要 / 描边**：`variant="secondary"` / `variant="outline"`
- **工具栏图标**：`variant="ghost" size="icon"`
- **输入框**：shadcn `Input`；聚焦 `ring-ring`
- **面板**：`bg-background border-border rounded-lg`

---

## 动效

| 场景 | 时长 | 缓动 |
| ---- | ---- | ---- |
| 按钮 hover | 150ms | ease-out（背景/字色） |
| 按钮 active（按下） | 75ms | ease-out；`translate-y-px` 仅 default/outline |
| 按钮 focus-visible | — | `ring-3 ring-ring/50`（仅键盘） |
| 面板 Tab 指示条 | 200ms | ease-out（`left`/`width`） |
| 面板 Tab 内容 | 150ms | fade-in |
| 面板展开/折叠 | 200ms | cubic-bezier(0.4, 0, 0.2, 1) |
| 对话框 | 150ms | ease-out，scale 0.95→1 |
| 播放头 | 无 | 逐帧精确 |

仅使用 `transform` + `opacity`。遵守 `prefers-reduced-motion`（`motion-reduce:*` 关闭 Tab 滑动与 fade）。

---

## Z-index 层级（10 级）

| 层级 | z-index |
| ---- | ------- |
| 模态框 | 100 |
| 下拉 / 右键菜单 | 90 |
| Tooltip / 引导 | 80 |
| 加载遮罩 | 70 |
| 浮动工具栏 / 拖拽幽灵 | 60 |
| AI 面板气泡 | 50 |
| 顶栏工具栏 | 40 |
| 播放头 / 智能参考线 | 30 |
| 选中片段 | 20 |
| 时间线标尺 | 10 |
| 基础层 | 0 |

---

## 图标与 UX 规则

- **Lucide** 24×24，工具栏 `w-4 h-4`
- 不用 emoji 充当图标
- 所有可点击元素加 `cursor-pointer`
- Hover 仅改颜色/透明度，不做引起布局抖动的 scale
- 暗色背景文字对比度 ≥ 4.5:1

---

## 布局默认值（编辑器壳层）

| 面板 | 默认 | 最小 | 最大 |
| ---- | ---- | ---- | ---- |
| 左侧 | 220px | 160 | 350 |
| 右侧 | 280px | 200 | 400 |
| 时间线 | 220px | 150 | 350 |

预览优先：中间列尽量放大；AI 放在右侧 Tab 或底部 48px 栏。

---

## 交付前检查

见 UI 文档 §0.6 与 ui-ux-pro-max 技能 Pre-Delivery Checklist。
