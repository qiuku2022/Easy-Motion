# Easy-Motion 排版系统规范 (Typography)

> **关联文档**：[设计系统主文档](./README.md) ｜ [色彩系统](./01-color-palette.md) ｜ [轮廓与圆角](./03-shape-and-radii.md)  
> **设计基准**：
> - [GitHub Primer Typography Primitives](https://primer.style/product/primitives/typography/)
> - [GitHub Mona Sans & Hubot Sans](https://github.com/github/mona-sans)
> - [Easy-Motion 时间线与时间码规范](../requirements/时间线编辑.md)

---

## 一、排版系统理念与多场景需求

在桌面动画制作软件中，文字排版具有多重维度的挑战：
1. **高密度控制面板**：属性检查器包含大量细小参数名（如 `X 坐标`、`旋转角度`、`缓动曲线`），需要紧凑且不拥挤的标签排版；
2. **高速动态时间码**：播放视频时，时间码（如 `00:02:15:08`）以 30fps 或 60fps 频率刷新，普通比例字体会导致宽度不断伸缩抖动（Layout Jitter）；
3. **现代工程工具美学**：吸收 GitHub Mona Sans 与 Primer 精炼的标题与文本节奏，摆脱传统视频软件的陈旧感。

---

## 二、字体栈结构 (Font Stacks)

根据用途不同，Easy-Motion 确立三套标准字体回退链：

```css
:root {
  /* 1. 标题与品牌展示字体栈 (Brand & Display) */
  --font-display: "Mona Sans", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", sans-serif;

  /* 2. 界面通用无衬线字体栈 (UI Base Sans) */
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Plus Jakarta Sans", "Noto Sans", Roboto, Helvetica, Arial, sans-serif;

  /* 3. 等宽与时间码字体栈 (Monospace & Tabular Figures) */
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
}
```

### 字体特性配置说明
- **界面常规文字**：采用系统原生无衬线字体（Windows 11 下为优化渲染后的 Segoe UI / Plus Jakarta Sans），兼顾清晰锐利与极低资源消耗；
- **数字与代码展示**：统一启用 **等宽数字特性** (`font-variant-numeric: tabular-nums` 或 `font-feature-settings: "tnum" 1`)，确保数字宽度严格等齐。

---

## 三、标准字阶比例尺 (Type Scale Matrix)

遵循 Primer 的模块化字阶标准，建立以 14px 为基准的 7 级阶梯体系：

| 字阶等级 | 像素字号 | 行高 (Line Height) | 字重 (Weight) | 字距 (Letter Spacing) | 经典应用场景 |
|:---|:---:|:---:|:---:|:---:|:---|
| **Micro (11px)** | `11px` (0.6875rem) | `14px` (1.27) | `500` (Medium) | `+0.02em` | 时间线刻度毫秒/帧数、轨道状态胶囊徽标、极小微调后缀 |
| **Caption (12px)**| `12px` (0.75rem) | `16px` (1.33) | `400` / `500` | `+0.01em` | 属性面板字段标签、快捷键提示、轨道静音/锁定次级提示 |
| **Base (14px)** | `14px` (0.875rem) | `20px` (1.42) | `400` / `500` / `600` | `0` | **全局核心基准**：按钮文字、输入框内容、菜单项、树形列表 |
| **Medium (16px)** | `16px` (1.00rem) | `24px` (1.50) | `600` (Semibold)| `-0.01em` | 面板折叠分组标题（`Transform` / `Keyframes`）、卡片主标题 |
| **Large (20px)** | `20px` (1.25rem) | `28px` (1.40) | `600` (Semibold)| `-0.015em` | 弹窗 Dialog 标题、导出设置主步骤标题、AI 会话主题 |
| **Title (24px)** | `24px` (1.50rem) | `32px` (1.33) | `600` (Semibold)| `-0.02em` | 欢迎屏幕项目名称、空状态引导大标题 |
| **Display (32px)**| `32px` (2.00rem) | `40px` (1.25) | `700` (Bold) | `-0.025em` | 品牌启动页、版本发布重大通知 |

---

## 四、时间码与关键帧数字排版专属规范 (Tabular Numbers)

时间码与帧数是音视频编辑器的核心数据资产，必须严格执行以下排版规则：

### 4.1 时间码排版规则

```
    00 : 01 : 24 : 15
    ──   ──   ──   ──
    时   分   秒   帧
```

1. **等宽对齐**：使用等宽字体 `--font-mono`，声明 `font-variant-numeric: tabular-nums`；
2. **冒号垂直居中**：时间码各段之间的分隔冒号使用统一半角 `:`，字重与数字保持完全一致（推荐 `500 Medium`）；
3. **前置补零 (Zero Padding)**：小时、分钟、秒、帧恒定保持两位字符（`00`~`59`，帧为 `00`~`fps-1`），禁止省略前导零引发文字跳位。

### 4.2 CSS 规范片段

```css
/* 时间码与帧数显示专用类 */
.timecode-display {
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
  color: var(--fgColor-default);
  text-align: right;
  user-select: none;
}

/* 属性面板数字微调器 */
.property-number-input {
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 16px;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}
```

---

## 五、层级权重与对比约束 (Hierarchy & Weights)

| 语义层级 | 字重 Token | CSS 数值 | 使用限制与规则 |
|:---|:---|:---:|:---|
| **Regular** | `font-normal` | 400 | 绝大部分正文、长篇描述、代码注释、输入框内容 |
| **Medium** | `font-medium` | 500 | 交互控件（按钮、Tab、选择器）、字段标签、时间码 |
| **Semibold** | `font-semibold`| 600 | 面板标题、关键操作按钮、高亮状态指示、导航分类 |
| **Bold** | `font-bold` | 700 | 仅限于大尺寸 Display 标题与主 Logo，禁止在 14px 以下界面常规控件中使用 |

---

## 六、无障碍排版检查清单 (Typography A11y Checklist)

- [ ] **最小可见字号**：界面中任何非装饰性功能文本不得小于 `11px`；
- [ ] **文字容器截断**：长文件名与图层名必须采用单行截断省略（`truncate`），并在 `hover` 时通过 `Tooltip` 完整显示原名；
- [ ] **文本行高裕量**：所有多行文本的行高不得低于字号的 1.4 倍，确保多语言（中文、英文、日文）混排时无上下字冠裁切；
- [ ] **缩放支持**：所有基础尺寸均映射为 `rem` 相对单位，支持 Windows 系统 DPI 缩放（125%、150%、200%）自适应放大无失真。
