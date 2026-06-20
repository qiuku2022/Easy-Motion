# EasyMotion Design System (Master)

> **Authority**: `docs/requirements/UI布局与交互设计-优化版.md` v1.0 overrides skill-generated defaults where they conflict.
> **Page overrides**: `docs/design-system/easymotion/pages/[page].md` if present.

---

## Color System — shadcn Neutral Dark（v1.1+）

> 2026-06 起壳层 UI 采用 [shadcn neutral `.dark`](https://ui.shadcn.com/docs/theming)。旧 Cinema Dark + Action Red 已弃用（见 `.local/theme-refresh/`）。

| Role | 感知 | Tailwind / CSS var |
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

**Theme**: shadcn `.dark` on `<html>`. v1.0 ships dark only.

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

## Typography

| Role | Font              | Weights       |
| ---- | ----------------- | ------------- |
| UI   | Plus Jakarta Sans | 400, 500, 600 |
| Mono | JetBrains Mono    | 400           |

```css
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap");
```

Scale: `text-xs` 12px → `text-2xl` 24px.

---

## Spacing & Radius

- Spacing: 4 / 8 / 12 / 16 / 24px (`space-1` … `space-6`)
- Radius: `rounded-lg` 8px (`--radius-overlay`) for **buttons** and **inputs**; `rounded-md` 4px (`--radius-control`) for menu items / tabs; `rounded-sm` 3px for timeline canvas only

---

## Components (tokens)

- **Primary button**: shadcn `Button variant="default"` → `bg-primary text-primary-foreground`（浅灰白）；**圆角 `rounded-lg`（8px）**，与 Input 一致（`button.tsx` 已自定义，升级 shadcn 时需保留）
- **Secondary / outline**: `variant="secondary"` / `variant="outline"`
- **Toolbar icons**: `variant="ghost" size="icon"`
- **Input**: shadcn `Input`；聚焦 `ring-ring`
- **Panel**: `bg-background border-border rounded-lg`

---

## Motion

| Scene                     | Duration | Easing                       |
| ------------------------- | -------- | ---------------------------- |
| Button hover              | 150ms    | ease-out（背景/字色）        |
| Button active (press)     | 75ms     | ease-out；`translate-y-px` 仅 default/outline |
| Button focus-visible      | —        | `ring-3 ring-ring/50`（仅键盘） |
| Panel tab indicator       | 200ms    | ease-out（`left`/`width`）   |
| Panel tab content         | 150ms    | fade-in                      |
| Panel expand/collapse     | 200ms    | cubic-bezier(0.4, 0, 0.2, 1) |
| Dialog                    | 150ms    | ease-out, scale 0.95→1       |
| Playhead                  | none     | frame-accurate               |

Use `transform` + `opacity` only. Respect `prefers-reduced-motion`（`motion-reduce:*` 关闭 tab 滑动与 fade）。

---

## Z-index scale (10-step)

| Layer                         | z-index |
| ----------------------------- | ------- |
| Modal                         | 100     |
| Dropdown / context menu       | 90      |
| Tooltip / onboarding          | 80      |
| Loading overlay               | 70      |
| Floating toolbar / drag ghost | 60      |
| AI panel bubbles              | 50      |
| Top toolbar                   | 40      |
| Playhead / smart guides       | 30      |
| Selected clip                 | 20      |
| Timeline ruler                | 10      |
| Base                          | 0       |

---

## Icons & UX rules (ui-ux-pro-max)

- **Lucide** 24×24, toolbar `w-4 h-4`
- No emoji as icons
- `cursor-pointer` on all clickables
- Hover: color/opacity only — no layout-shifting scale
- Text contrast ≥ 4.5:1 on dark backgrounds

---

## Layout defaults (editor shell)

| Panel    | Default | Min | Max |
| -------- | ------- | --- | --- |
| Left     | 220px   | 160 | 350 |
| Right    | 280px   | 200 | 400 |
| Timeline | 220px   | 150 | 350 |

Preview-first: center column maximized; AI in right Tab or bottom 48px bar.

---

## Pre-delivery checklist

See UI doc §0.6 and ui-ux-pro-max skill Pre-Delivery Checklist.
