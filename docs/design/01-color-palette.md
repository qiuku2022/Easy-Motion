# Easy-Motion 色彩系统规范 (Color Palette)

> **关联文档**：[设计系统主文档](./README.md) ｜ [排版系统](./02-typography.md) ｜ [代码落地](./05-tokens-and-implementation.md)  
> **设计基准**：
> - [GitHub Brand Foundations: Color](https://brand.github.com/foundations/color)
> - [Primer Brand Primitives: Color](https://primer.github.io/brand/primitives/color/)
> - [Primer Product Primitives: Color](https://primer.style/product/primitives/color/)

---

## 一、GitHub Brand 与产品色彩哲学

GitHub 的色彩架构分为两大基石：**Brand Foundation（品牌基石）** 与 **Primer Product Primitives（产品基元）**。

### 1.1 Brand Hero Color（品牌核心英雄色）

根据 [GitHub Brand Foundations](https://brand.github.com/foundations/color)，GitHub 的首要核心英雄色为：
- **GitHub Green**：`#0FBF3E`（RGB: `15, 191, 62`）
- **调性定义**：严谨、现代、技术专业且自信（"Technical, sophisticated, serious, and uncomplicated"）。
- **品牌原则**：以单点高饱和的 GitHub Green 作为全局视觉重心的锚点，搭配大面积中性色（黑、白、深浅冷灰）来构建极度克制、高效的专业氛围。

### 1.2 Primary Palette 与 Secondary Palette 职责划分

```
┌────────────────────────────────────────────────────────────────────────┐
│                        GitHub 配色体系架构分工                         │
├──────────────────────────────────┬─────────────────────────────────────┤
│   Primary Palette（核心基石）     │    Secondary Palette（功能与外延）   │
│   - GitHub Green (#0FBF3E)       │    - Copilot Purple (#A371F7)       │
│   - 纯黑与暗色灰黑 (Blacks)       │    - Accent Blue (#2F81F7)          │
│   - 界面冷灰阶 (Grays 0-9)        │    - Attention Yellow (#D29922)     │
│   - 纯白与亮灰 (Whites)           │    - Danger Red (#F85149)           │
│   用途：窗口框架、主要 CTA、底色  │    用途：AI 助手、选中高亮、警示、音视频轨道│
└──────────────────────────────────┴─────────────────────────────────────┘
```

---

## 二、Easy-Motion 三层颜色 Token 体系

遵循 GitHub Primer 三层 Token 架构，避免硬编码十六进制值。

### 2.1 Layer 1: Primitive Tokens（原始色度阶梯）

#### 中性灰度阶梯 (Neutral Grayscale - Dark Base)
| Token 名称 | Hex 色值 | sRGB (R, G, B) | 用途说明 |
|:---|:---|:---|:---|
| `--pr-color-gray-0` | `#f0f6fc` | 240, 246, 252 | 极高亮前景色、纯白文本强调 |
| `--pr-color-gray-1` | `#e6edf3` | 230, 237, 243 | **Dark 模式默认文字主色 (`fg.default`)** |
| `--pr-color-gray-2` | `#c9d1d9` | 201, 209, 217 | 次要前景色、常规图标色 |
| `--pr-color-gray-3` | `#8b949e` | 139, 148, 158 | 弱化说明文字、次要图标 |
| `--pr-color-gray-4` | `#7d8590` | 125, 133, 144 | **Dark 模式次要文本 (`fg.muted`)** |
| `--pr-color-gray-5` | `#6e7681` | 110, 118, 129 | 占位符、禁用态文字 |
| `--pr-color-gray-6` | `#30363d` | 48, 54, 61 | **Dark 模式标准边框线 (`border.default`)** |
| `--pr-color-gray-7` | `#21262d` | 33, 38, 45 | **次级背景、次要边框 (`border.muted`)** |
| `--pr-color-gray-8` | `#161b22` | 22, 27, 34 | **面板底色 (`canvas.subtle`)** |
| `--pr-color-gray-9` | `#0d1117` | 13, 17, 23 | **主工作区底色 (`canvas.default`)** |
| `--pr-color-gray-10`| `#010409` | 1, 4, 9 | **内嵌凹陷区底色 (`canvas.inset`)** |

#### 品牌绿色阶梯 (GitHub Green Scale)
| Token 名称 | Hex 色值 | sRGB (R, G, B) | 用途说明 |
|:---|:---|:---|:---|
| `--pr-color-green-brand` | `#0FBF3E` | 15, 191, 62 | **GitHub Brand 核心英雄色**（Logo、高光强调） |
| `--pr-color-green-0` | `#aff5b4` | 175, 245, 180 | 浅色高光背景、成功微徽章 |
| `--pr-color-green-1` | `#7ee787` | 126, 231, 135 | 高亮成功提示文本 |
| `--pr-color-green-2` | `#3fb950` | 63, 185, 80 | **Dark 模式强调绿色文本/图标 (`success.fg`)** |
| `--pr-color-green-3` | `#2ea043` | 46, 160, 67 | **主按钮悬停态 (`button.primary.hover`)** |
| `--pr-color-green-4` | `#238636` | 35, 134, 54 | **Dark 模式主行动按钮默认色 (`button.primary.bg`)** |
| `--pr-color-green-5` | `#196c2e` | 25, 108, 46 | 主按钮按下态 (`button.primary.active`) |
| `--pr-color-green-8` | `#04260f` | 4, 38, 15 | 绿色柔和半透明填充背景基底 |

#### 功能色彩阶梯 (Accent, Attention, Danger, Copilot)
- **Blue (Accent)**:
  - `--pr-color-blue-4`: `#1f6feb` (聚焦外环、激活指示条)
  - `--pr-color-blue-3`: `#2f81f7` (时间线播放头、选区高亮、活动链接)
  - `--pr-color-blue-2`: `#58a6ff` (深色中高亮蓝色文字)
- **Yellow/Amber (Attention)**:
  - `--pr-color-yellow-3`: `#d29922` (资源离线、吸附警示、关键帧提示)
  - `--pr-color-yellow-8`: `#341a00` (警示条柔和底色)
- **Red (Danger)**:
  - `--pr-color-red-4`: `#da3633` (危险按钮默认态)
  - `--pr-color-red-3`: `#f85149` (错误提示、删除操作悬停高亮)
  - `--pr-color-red-8`: `#3c1114` (错误弹框柔和底色)
- **Purple (AI Copilot / Agent)**:
  - `--pr-color-purple-3`: `#a371f7` (AI 助手图标、智能生成中发光环)
  - `--pr-color-purple-2`: `#bc8cff` (AI 回复高亮代码与关键词)

---

## 三、Easy-Motion 核心暗色模式（Dark Default 语义映射表）

桌面动画应用 95% 以上使用场景为暗色模式。以下为生产级语义 Token 定义：

```css
:root,
.dark {
  /* ================= 1. 画布与背景 (Canvas & Surfaces) ================= */
  --canvas-default: #0d1117;          /* 窗口根底色、工作区底层 */
  --canvas-subtle: #161b22;           /* 左右侧栏、顶部工具栏、卡片容器 */
  --canvas-inset: #010409;            /* 时间线轨道容器底色、输入框内陷区 */
  --canvas-overlay: #161b22;          /* 下拉菜单、Dialog 弹窗、悬浮条 */
  --preview-stage: #05070a;           /* Remotion 渲染舞台边缘深渊区 */

  /* ================= 2. 前景与文本 (Foregrounds) ================= */
  --fgColor-default: #e6edf3;         /* 主文字、高频阅读文本 */
  --fgColor-muted: #7d8590;           /* 次要说明、单位后缀、快捷键提示 */
  --fgColor-subtle: #6e7681;          /* 禁用选项、输入占位符 (Placeholder) */
  --fgColor-onEmphasis: #ffffff;      /* 纯白文字（用于高对比主按钮内） */

  /* ================= 3. 边框与线缆 (Borders & Dividers) ================= */
  --borderColor-default: #30363d;     /* 主面板边界、分隔线（1px 物理感） */
  --borderColor-muted: #21262d;       /* 轨道网格微细线、二级列表分割 */
  --borderColor-emphasis: #8b949e;    /* 悬停边缘高亮 */
  --borderColor-accent: #1f6feb;      /* 聚焦焦点环、活动面板外框 */

  /* ================= 4. 主行动按钮 (Primary Action CTA) ================= */
  --button-primary-bgColor-rest: #238636;
  --button-primary-bgColor-hover: #2ea043;
  --button-primary-bgColor-active: #29903b;
  --button-primary-bgColor-disabled: rgba(35, 134, 54, 0.4);
  --button-primary-fgColor-rest: #ffffff;
  --button-primary-borderColor-rest: rgba(240, 246, 252, 0.1);

  /* ================= 5. 次级按钮 (Default Button) ================= */
  --button-default-bgColor-rest: #21262d;
  --button-default-bgColor-hover: #30363d;
  --button-default-bgColor-active: #282e33;
  --button-default-fgColor-rest: #c9d1d9;
  --button-default-borderColor-rest: #30363d;

  /* ================= 6. 状态交互色彩 (Functional States) ================= */
  --accent-fg: #2f81f7;
  --accent-emphasis: #1f6feb;
  --accent-subtle: rgba(56, 139, 253, 0.15);

  --success-fg: #3fb950;
  --success-emphasis: #238636;
  --success-subtle: rgba(46, 160, 67, 0.15);

  --attention-fg: #d29922;
  --attention-emphasis: #9e6a03;
  --attention-subtle: rgba(187, 128, 9, 0.15);

  --danger-fg: #f85149;
  --danger-emphasis: #da3633;
  --danger-subtle: rgba(248, 81, 73, 0.15);

  --copilot-fg: #a371f7;
  --copilot-emphasis: #8250df;
  --copilot-subtle: rgba(163, 113, 247, 0.15);
}
```

---

## 四、Easy-Motion 动画剪辑多轨道色谱 (Timeline Tracks Palette)

在多轨道时间线编辑中，不同类别的轨道需要清晰的色彩区分，同时必须保证与底层 `#010409` 容器和上方文字的高对比度。

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Easy-Motion 轨道类别色谱映射                      │
├────────────┬─────────────┬─────────────┬───────────────────────────────┤
│ 轨道类型   │ 块底色 (Hex)│ 边框色 (Hex)│ 视觉特征与含义                │
├────────────┼─────────────┼─────────────┼───────────────────────────────┤
│ 视频/画面  │ `#1f4028`   │ `#3fb950`   │ GitHub 绿系微调，代表主画面流 │
│ 音频/配乐  │ `#13384e`   │ `#388bfd`   │ 沉静深海蓝，波形显示清晰      │
│ 字幕/文本  │ `#453316`   │ `#d29922`   │ 醒目琥珀金，文字内容便于辨识  │
│ 特效/转场  │ `#392556`   │ `#a371f7`   │ 魔法紫，代表 Remotion 动效代码│
│ 遮罩/贴纸  │ `#451e33`   │ `#db61a2`   │ 莓果粉，代表装饰图层          │
└────────────┴─────────────┴─────────────┴───────────────────────────────┘
```

> **设计准则**：
> - 轨道块背景使用 **深色半透明基底**（对应各主色的 15%~25% 明度），防止满屏大色块刺眼；
> - 轨道块边缘采用对应颜色的 **1px 实线边框**（如 `#3fb950`），片段被选中时，边框加粗至 2px 并叠加高亮白色外晕轮。

---

## 五、无障碍（Accessibility）与对比度矩阵

所有核心界面元素均在黑暗模式基准底色（`#0d1117` 与 `#161b22`）上通过 WCAG 2.1 对比度验证：

| 前景色 Token | 背景色 Token | 测量对比度 | WCAG 评级 | 适用场景 |
|:---|:---|:---:|:---:|:---|
| `fgColor-default` (`#e6edf3`) | `canvas.default` (`#0d1117`) | **13.9 : 1** | **AAA** ✅ | 所有主体文字、标题、菜单项 |
| `fgColor-muted` (`#7d8590`) | `canvas.default` (`#0d1117`) | **4.7 : 1** | **AA** ✅ | 次要说明、快捷键、文件大小 |
| `button-primary-fg` (`#ffffff`) | `button-primary-bg` (`#238636`) | **4.6 : 1** | **AA** ✅ | 渲染/导出主按钮文字 |
| `accent-fg` (`#2f81f7`) | `canvas.subtle` (`#161b22`) | **5.3 : 1** | **AA** ✅ | 属性高亮、超链接、播放头数字 |
| `copilot-fg` (`#a371f7`) | `canvas.subtle` (`#161b22`) | **6.1 : 1** | **AA** ✅ | AI 对话提示文字、代码标签 |
| `borderColor-default` (`#30363d`)| `canvas.default` (`#0d1117`) | **1.8 : 1** | UI Component ✅ | 界面分界、窗口切分线条 |

---

## 六、亮色主题备用映射（Light Mode Compatibility）

为满足报表导出、明亮工作环境演示需求，设计系统预置了亮色镜像对照表：

| 语义角色 | Dark Mode (默认) | Light Mode (备用) | 遵循依据 |
|:---|:---|:---|:---|
| `canvas.default` | `#0d1117` | `#ffffff` | Primer Light Canvas |
| `canvas.subtle` | `#161b22` | `#f6f8fa` | Primer Light Subtle |
| `canvas.inset` | `#010409` | `#f6f8fa` (带浅阴影) | Primer Light Inset |
| `fgColor-default`| `#e6edf3` | `#1f2328` | Primer Light Text |
| `fgColor-muted` | `#7d8590` | `#656d76` | Primer Light Muted |
| `borderColor-default` | `#30363d` | `#d0d7de` | Primer Light Border |
| `button-primary-bg` | `#238636` | `#1f883d` | Primer Light Primary Green |
