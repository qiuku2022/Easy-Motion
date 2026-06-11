# 04 — 阶段 2：基础 Primitive

> 官方： [Button](https://ui.shadcn.com/docs/components/button) · [Input](https://ui.shadcn.com/docs/components/input) · [Label](https://ui.shadcn.com/docs/components/label) · [Separator](https://ui.shadcn.com/docs/components/separator) · [Tooltip](https://ui.shadcn.com/docs/components/tooltip)

---

## 1. 目标

安装并验证最常用的 shadcn primitive，建立「业务组件 → shadcn」替换模式，**本阶段不改时间线画布**。

---

## 2. 安装命令

```powershell
cd apps/electron
npx shadcn@latest add button input label textarea separator tooltip
```

---

## 3. 组件用法要点（摘自官方 + ui-ux-pro-max）

### 3.1 Button

| 场景 | variant | size | 项目 className |
|------|---------|------|----------------|
| 主 CTA | `default` | `default` | `rounded-sm` |
| 次级 | `secondary` / `outline` | `sm` | `rounded-sm` |
| 图标按钮 | `ghost` | `icon` | `h-8 w-8` |
| 危险 | `destructive` | `sm` | — |

- 使用 `variant` prop，禁止内联 `bg-red-500` 分支（[shadcn 准则](https://ui.shadcn.com/docs/components/button)）
- 需要链接样式时用 `asChild` + `<a>` / React Router

### 3.2 Input / Textarea / Label

- 属性面板、素材搜索等统一用 shadcn 控件
- **必须**配 `Label` 或 `htmlFor`（[a11y](../../docs/requirements/可访问性设计.md)）
- 聚焦环由 `--ring`（teal）驱动，无需手写 `focus:ring-em-teal`

### 3.3 Separator

- 用于 `ClipFloatingToolbar` 内竖线分隔
- 替代手写 `<div className="w-px bg-em-border" />`

### 3.4 Tooltip

**必须在应用根级包裹 `TooltipProvider`**（[官方](https://ui.shadcn.com/docs/components/tooltip)）：

```tsx
// App.tsx 或 main.tsx
<TooltipProvider delayDuration={300}>
  <App />
</TooltipProvider>
```

工具栏图标按钮：`Tooltip` + `TooltipTrigger asChild` + `Button variant="ghost" size="icon"`

---

## 4. 首批替换点位

| 文件 | 改动 |
|------|------|
| `layout/TopToolbar.tsx` | 工具栏按钮 → `Button` + `Tooltip` |
| `timeline/TimelineTransport.tsx` | 播放控制按钮 → `Button variant="ghost" size="icon"` |
| `timeline/TimelineZoomControls.tsx` | 缩放按钮 → `Button` |
| `properties/ClipPropertyFields.tsx` | `input`/`textarea` → `Input`/`Textarea` + `Label` |
| `timeline/ClipFloatingToolbar.tsx` | 分隔线 → `Separator` |

---

## 5. 迁移模板：图标按钮

**Before（典型）：**

```tsx
<button
  type="button"
  title="播放"
  className="cursor-pointer rounded-sm p-1.5 text-em-muted hover:bg-em-elevated"
  onClick={onPlay}
>
  <Play className="h-4 w-4" />
</button>
```

**After：**

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-sm" onClick={onPlay}>
      <Play className="h-4 w-4" />
      <span className="sr-only">播放</span>
    </Button>
  </TooltipTrigger>
  <TooltipContent>播放</TooltipContent>
</Tooltip>
```

---

## 6. 执行顺序

1. 安装组件
2. `App.tsx` 添加 `TooltipProvider`
3. 改 `TopToolbar.tsx`（最简单）
4. 改 `ClipPropertyFields.tsx`（验证表单样式）
5. `pnpm dev` 全路径点击测试

---

## 7. 完成标准

- [ ] 5 个 primitive 已安装
- [ ] `TooltipProvider` 在根级
- [ ] 至少 2 个文件完成替换
- [ ] 工具栏 hover/focus 可见，对比度合格
- [ ] 无新增 `title=` 替代 Tooltip（改用 `TooltipContent` 或 `sr-only`）
