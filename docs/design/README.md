# Easy-Motion 设计系统：GitHub Design 规范

> **版本**：v2.0（GitHub Primer & Brand 规范落地版）  
> **定位**：面向专业桌面级音视频与动画制作的现代工程美学设计系统  
> **对齐标准**：
> - [GitHub Brand Foundations: Color](https://brand.github.com/foundations/color)
> - [Primer Brand Primitives: Color](https://primer.github.io/brand/primitives/color/)
> - [Primer Product Primitives: Color, Typography & Radii](https://primer.style/product/primitives/)
> - [Easy-Motion 现行 UI 布局与交互设计](../requirements/UI布局与交互设计-优化版.md)

---

## 一、设计系统愿景与核心理念

Easy-Motion 是一款融合 **Remotion 动态代码编排**、**多轨道时间线剪辑** 与 **LLM-Agent 智能生成** 的桌面级动画应用。为了让创作者既能拥有媲美专业视频软件（Adobe Premiere / Final Cut Pro）的高密度控制力，又能享受如 GitHub 般严谨、精致、低认知负荷的现代开发者工具体验，本项目确立了基于 **GitHub Design** 的全新视觉与交互标准。

```
                     ┌──────────────────────────────────────┐
                     │          Easy-Motion UI 核心         │
                     │  专业制作 (Pro)  +  极简高质 (GitHub)  │
                     └──────────────────┬───────────────────┘
                                        │
         ┌──────────────────────────────┼──────────────────────────────┐
         ▼                              ▼                              ▼
┌──────────────────┐           ┌──────────────────┐           ┌──────────────────┐
│   底色层级系统   │           │ 品牌主色与行动色 │           │  结构秩序与微倒角 │
│  Neutral Slate   │           │   GitHub Green   │           │ 4px / 6px Radii  │
│  纯净画板，无偏色 │           │  高确认度核心 CTA │           │ 高信息密度，秩序美 │
└──────────────────┘           └──────────────────┘           └──────────────────┘
```

### 核心设计原则

1. **画板纯净，零视觉干扰（Content-Neutral Canvas）**：
   视频调色与动效设计对环境光与邻近色极度敏感。界面底色采用 GitHub Primer 经过苛刻验证的中性冷灰黑（`#0d1117` / `#161b22` / `#010409`），绝不引入蓝紫等环境色杂讯，确保预览舞台（Remotion Preview）画质与色准的原汁原味。

2. **行动明确，权威肯定（GitHub Green as Hero Action）**：
   承袭 GitHub 品牌定义的核心英雄色 **GitHub Green**（`#0FBF3E`）与暗色产品主行动绿（`#238636`），用于关键动作（渲染导出、AI 生成、应用模板、关键帧提交）。在深灰基底中提供确定性极高的视觉锚点，避免泛滥使用强调色造成视疲劳。

3. **紧凑几何，秩序井然（Functional Density & Compact Radii）**：
   摒弃消费级 Web 应用常见的夸张大圆角与弥散投影，全面导入 GitHub 标志性的 **6px / 4px 微圆角** 与 **1px 锐利物理边框**。在有限的桌面屏幕中最大化容纳轨道信息、微调数值与层级树。

4. **双向无障碍，多模式兼容（Accessibility & Contrast Parity）**：
   所有文字与关键控件均满足 **WCAG 2.1 AA / AAA** 标准（常规文字对比度 ≥ 4.5:1，主标题与大尺寸强调 ≥ 7:1），原生提供暗色（Dark Default）第一公民支持与完备的亮色（Light Mode）映射表。

---

## 二、三层 Token 架构设计

遵循现代设计系统架构，将所有视觉参数解耦为三层标准 Token：

```
┌────────────────────────────────────────────────────────────────────────┐
│  Layer 1: Primitive Tokens（原始值层）                                  │
│  定义物理基础色板、字体尺寸、基础圆角数值                               │
│  示例：--pr-color-gray-900: #0d1117;  --pr-radius-md: 6px;             │
├────────────────────────────────────────────────────────────────────────┤
│  Layer 2: Semantic / Functional Tokens（语义功能层）                   │
│  关联具体界面角色（背景、文字、边框、状态），支持主题无缝切换          │
│  示例：--canvas-default: var(--pr-color-gray-900);                      │
│        --fgColor-default: var(--pr-color-gray-100);                    │
├────────────────────────────────────────────────────────────────────────┤
│  Layer 3: Component Tokens（组件特异层）                               │
│  服务于具体业务组件的特异性组合                                        │
│  示例：--button-primary-bg: var(--bgColor-success-emphasis);           │
│        --timeline-track-border: var(--borderColor-muted);               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 三、子文档结构与导航索引

本项目设计系统拆分为 5 篇独立深入的专业子文档，涵盖色彩、排版、圆角、场景组件及代码实施：

| 子文档 | 文档名称 | 核心内容 | 适用场景 |
|:---|:---|:---|:---|
| **[01]** | [色彩系统 (Color Palette)](./01-color-palette.md) | GitHub Green 主色、Primer 暗/亮底色层阶、功能性语义色、动画轨道专属色谱、对比度矩阵 | 调色、主题配置、状态配色、轨道标识 |
| **[02]** | [排版系统 (Typography)](./02-typography.md) | 跨平台字体栈、字阶比例尺（11px ~ 32px）、时间码与关键帧数值等宽（`tnum`）规范 | 文字排版、时间刻度、代码与属性微调 |
| **[03]** | [轮廓与圆角 (Shape & Radii)](./03-shape-and-radii.md) | Primer 2px ~ 12px 几何圆角梯度、1px 物理微边框、分层微投影与光标聚焦环 | 按钮、输入框、片段 Clip、弹窗容器 |
| **[04]** | [工作台组件与交互模式 (Components & Patterns)](./04-components-and-patterns.md) | 顶部栏、多轨时间线（Playhead/Clip/Snap）、预览舞台浮动条、AI 助手面板规范 | 页面布局、复杂交互、状态反馈 |
| **[05]** | [代码落地与 Token 映射 (Tokens & Implementation)](./05-tokens-and-implementation.md) | Tailwind 配置扩展、CSS Variables 清单、OKLCH 与 Hex 转换、shadcn 平滑迁移 | 前端开发、样式编写、组件封装 |

---

## 四、与现行技术栈的映射关系

Easy-Motion 现行前端技术基线为：
- **容器与框架**：Electron 31 + React 18 + TypeScript
- **样式方案**：Tailwind CSS + shadcn/ui
- **渲染核心**：Remotion 4.x + WebCodecs / FFmpeg

本规范将全面继承并升级现行 `apps/electron/tailwind.config.js` 与 `apps/electron/src/renderer/src/index.css`，将原先简单的通用中性灰配置替换为一套与 GitHub Primer 深度对齐、具备完整三层架构的生产级 Token 体系。
