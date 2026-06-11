# 03 — 阶段 1：主题与 Design Token

> 官方参考：[Theming](https://ui.shadcn.com/docs/theming) · [Dark Mode](https://ui.shadcn.com/docs/dark-mode/vite)  
> 项目参考：[UI布局与交互设计-优化版 §0.1](../../docs/requirements/UI布局与交互设计-优化版.md) · [MASTER.md](../../docs/design-system/easymotion/MASTER.md)

---

## 1. 目标

将 **Cinema Dark + Action Red** 映射到 shadcn 语义 token，使 `bg-primary`、`bg-muted` 等与现有 `em-*` 视觉一致，为后续组件替换提供统一色板。

---

## 2. Token 映射表

| 设计角色 | Hex | 用途 | shadcn CSS 变量 | Tailwind 类 |
|----------|-----|------|-----------------|-------------|
| 背景主色 | `#0F0F23` | 主窗口、面板底 | `--background` | `bg-background` |
| 文字主色 | `#F8FAFC` | 标题、正文 | `--foreground` | `text-foreground` |
| 背景次色 | `#1A1A2E` | 输入框、次级面板 | `--muted` 或 `--card` | `bg-muted` / `bg-card` |
| 背景三级 | `#252542` | 悬停、列表交替 | `--accent` | `bg-accent` |
| 边框 | `#2D2D4A` | 分割线 | `--border`, `--input` | `border-border` |
| 文字次色 | `#94A3B8` | 描述、placeholder | `--muted-foreground` | `text-muted-foreground` |
| 强调主色 | `#E11D48` | CTA、播放头、选中 | `--primary` | `bg-primary` |
| 强调次色 | `#0D9488` | 聚焦环、成功 | `--ring` | `ring-ring`, `focus-visible:ring-ring` |
| 错误 | `#DC2626` | 删除、错误 | `--destructive` | `bg-destructive` |
| 警告 | `#F97316` | 警告态 | 自定义 `--warning`（可选） | `bg-warning` |

### HSL 变量值（与现有 `index.css` 对齐）

项目已使用 **无 `hsl()` 包装** 的空格分隔 HSL 分量（Tailwind v3 惯例）：

```css
.dark {
  --background: 240 10% 3.9%;        /* ≈ #0F0F23 */
  --foreground: 210 40% 98%;         /* ≈ #F8FAFC */
  --card: 240 10% 3.9%;
  --card-foreground: 210 40% 98%;
  --popover: 240 10% 3.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 347 77% 50%;            /* #E11D48 */
  --primary-foreground: 0 0% 100%;
  --secondary: 240 20% 15%;          /* ≈ #1E1B4B / 次级按钮区 */
  --secondary-foreground: 210 40% 98%;
  --muted: 240 20% 15%;              /* 输入背景 ≈ #1A1A2E 需视觉微调 */
  --muted-foreground: 215 20% 65%;   /* #94A3B8 */
  --accent: 240 20% 15%;             /* hover 面 ≈ #252542 */
  --accent-foreground: 210 40% 98%;
  --destructive: 0 84% 60%;          /* #DC2626 */
  --destructive-foreground: 0 0% 100%;
  --border: 240 15% 25%;             /* #2D2D4A */
  --input: 240 15% 25%;
  --ring: 173 80% 40%;               /* #0D9488 teal 聚焦 */
  --radius: 0.5rem;                  /* 8px → 与 rounded-lg 协调 */
}
```

> **注意**：`--muted` / `--accent` 与精确 hex 可能有 ±1 级亮度差；迁移后对照截图微调，优先保证对比度 ≥ 4.5:1。

---

## 3. `tailwind.config.js` 扩展

在 `theme.extend.colors` 增加 shadcn 语义色（init 可能已添加，需核对）：

```js
colors: {
  border: "hsl(var(--border))",
  input: "hsl(var(--input))",
  ring: "hsl(var(--ring))",
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  primary: {
    DEFAULT: "hsl(var(--primary))",
    foreground: "hsl(var(--primary-foreground))",
  },
  secondary: {
    DEFAULT: "hsl(var(--secondary))",
    foreground: "hsl(var(--secondary-foreground))",
  },
  destructive: {
    DEFAULT: "hsl(var(--destructive))",
    foreground: "hsl(var(--destructive-foreground))",
  },
  muted: {
    DEFAULT: "hsl(var(--muted))",
    foreground: "hsl(var(--muted-foreground))",
  },
  accent: {
    DEFAULT: "hsl(var(--accent))",
    foreground: "hsl(var(--accent-foreground))",
  },
  popover: {
    DEFAULT: "hsl(var(--popover))",
    foreground: "hsl(var(--popover-foreground))",
  },
  card: {
    DEFAULT: "hsl(var(--card))",
    foreground: "hsl(var(--card-foreground))",
  },
  // 过渡期保留 em-* 别名 → 指向同一变量
  em: {
    bg: "hsl(var(--background))",
    surface: "hsl(var(--muted))",
    elevated: "hsl(var(--accent))",
    border: "hsl(var(--border))",
    text: "hsl(var(--foreground))",
    muted: "hsl(var(--muted-foreground))",
    accent: "hsl(var(--primary))",
    "accent-hover": "hsl(347 77% 42%)",
    teal: "hsl(var(--ring))",
    warning: "hsl(25 95% 53%)",
    error: "hsl(var(--destructive))",
  },
},
```

---

## 4. 圆角与字体

与 [UI 文档 §0.2–0.3](../../docs/requirements/UI布局与交互设计-优化版.md) 对齐：

| Token | 值 | shadcn / Tailwind |
|-------|-----|-------------------|
| `rounded-sm` | 4px | Button 默认可 override `rounded-sm` |
| `rounded-md` | 6px | Input |
| `rounded-lg` | 8px | Card、Dialog |
| `--radius` | `0.5rem` (8px) | shadcn 组件默认圆角基准 |

字体保持 `tailwind.config.js` 现有配置：

- `font-sans` → Plus Jakarta Sans
- `font-mono` → JetBrains Mono（时间码）

---

## 5. 暗色模式策略（v1.0）

依据 [Dark Mode - Vite](https://ui.shadcn.com/docs/dark-mode/vite)：

| 方案 | v1.0 | v1.1 |
|------|------|------|
| `index.html` 静态 `class="dark"` | **采用** | 保留为默认 |
| `ThemeProvider` + `ModeToggle` | 不实现 | 实现 light/dark/system |
| `:root` + `.dark` 两套变量 | 仅完善 `.dark` | 补全 `:root` light |

shadcn 组件默认通过 `.dark` 选择器读取变量；确保变量定义在 `.dark` 下（或 `:root` 与 `.dark` 相同，因 html 恒为 dark）。

---

## 6. 自定义 warning token（可选）

若需警告色独立于 `destructive`，按 [Theming - Adding New Tokens](https://ui.shadcn.com/docs/theming#adding-new-tokens)：

```css
.dark {
  --warning: 25 95% 53%;
  --warning-foreground: 0 0% 100%;
}
```

```js
warning: {
  DEFAULT: "hsl(var(--warning))",
  foreground: "hsl(var(--warning-foreground))",
},
```

---

## 7. 组件级主题覆盖原则

依据官方建议：**通过 `className` 扩展，避免直接改 `components/ui/*.tsx` 源码**。

```tsx
// ✅ 项目级按钮：Premiere 风格小圆角
<Button className="rounded-sm" variant="default" />

// ✅ 输入框：teal 聚焦已由 --ring 控制
<Input className="bg-muted" />

// ❌ 避免
<Button className="bg-[#E11D48]" />
```

若需全局变体，在业务层封装：

```tsx
// components/common/EmButton.tsx（可选）
export function EmButton(props: ButtonProps) {
  return <Button className="rounded-sm" {...props} />;
}
```

---

## 8. 阶段 1 执行步骤

1. 完成阶段 0 `init`
2. 合并/校对 `index.css` 中 `.dark` 变量（上表）
3. 更新 `tailwind.config.js` 语义色 + `em` 别名
4. 将 `body` 样式改为语义类（可选）：
   ```css
   body { @apply bg-background text-foreground font-sans antialiased; }
   ```
5. 安装 `button`，渲染一个默认 Button 与现有 `em` 按钮截图对比
6. 运行 ui-ux-pro-max 检查：
   ```powershell
   python .cursor/skills/ui-ux-pro-max/scripts/search.py "dark mode css variables" --stack shadcn -n 5
   ```

---

## 9. 完成标准

- [ ] 语义色在 Tailwind 中可解析（`bg-background` 生效）
- [ ] `em-*` 别名指向 CSS 变量，旧组件视觉无突变
- [ ] `--primary` = Action Red，`--ring` = Teal 聚焦
- [ ] 对比度抽检：正文、muted 文字在 background 上 ≥ 4.5:1
