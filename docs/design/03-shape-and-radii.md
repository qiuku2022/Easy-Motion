# Easy-Motion 轮廓与圆角规范 (Shape & Radii)

> **关联文档**：[设计系统主文档](./README.md) ｜ [色彩系统](./01-color-palette.md) ｜ [组件与模式](./04-components-and-patterns.md)  
> **设计基准**：
> - [GitHub Primer Size & Radii Primitives](https://primer.style/product/primitives/size/)
> - [Primer Functional Border System](https://primer.style/product/primitives/color/#border)
> - [Easy-Motion 现行 UI 布局规范](../requirements/UI布局与交互设计-优化版.md)

---

## 一、轮廓与几何哲学：严谨、紧凑与秩序感

现代消费级 Web 应用常常采用 16px ~ 24px 的超大圆角与弥散阴影，但对于**高信息密度的专业桌面剪辑软件**而言，这种设计存在致命缺陷：
1. **侵蚀编辑空间**：大圆角会导致轨道、控件和微调数值的有效点击区域缩小，产生大量无用的留白；
2. **破坏对齐网格**：多轨道剪辑需要严格的像素级水平吸附与垂直对齐，平直坚挺的微圆角更能强化时间线的精密感；
3. **消除视觉杂讯**：夸张的阴影会扩散到 Remotion 视频预览舞台，干扰创作者对画面明暗反差的判断。

因此，Easy-Motion 全面承袭 **GitHub Primer 的几何美学**：以 **6px（Medium）与 4px（Small）** 为核心骨干，配合 **1px 物理微边框**，打造干净、锐利、耐看的专业生产力界面。

---

## 二、圆角阶梯 Token 规范 (Border Radius Scale)

```
2px (xsmall)      4px (small)      6px (medium)      8-12px (large)      9999px (full)
  [ ◆ ]          [ Clip 片段 ]    [ Primary 按钮 ]   [ Floating 浮层 ]    ( 3 ) 药丸徽章
微型关键帧/刻度     轨道块/标签项     标准控件/输入框    弹窗/悬浮工具条       状态指示/计数
```

| Token 阶梯 | 数值 (px / rem) | Primer 对应基元 | Easy-Motion 桌面专属应用场景 |
|:---|:---:|:---|:---|
| `--radius-xsmall` | `2px` (0.125rem) | `borderRadius-xsmall` | 关键帧菱形锚点端点、时间线播放头针尖、拖拽分割把手（Splitter Handle） |
| `--radius-small` | `4px` (0.250rem) | `borderRadius-small` | **时间线剪辑片段（Clip）**、Tab 分段控制器（Segmented Tab）、下拉菜单项、小尺寸 Tag |
| `--radius-medium` | `6px` (0.375rem) | `borderRadius-medium` | **全局核心基准控件**：主/次级按钮（Button）、输入框（Input）、下拉选择器（Select Trigger）、卡片面板 |
| `--radius-large` | `8px` (0.500rem) | `borderRadius-large` | 悬浮微型工具条（Floating Toolbar）、上下文右键菜单（Context Menu）、属性分组卡片 |
| `--radius-xlarge`| `12px` (0.750rem) | `borderRadius-xlarge`| 模态对话框（Modal Dialog）、AI 助手对话浮窗、项目设置大窗口 |
| `--radius-full` | `9999px` | `borderRadius-full` | 状态圆点指示灯（Status Dot）、数字徽标药丸（Counter Pill）、圆形单图标按钮 |

---

## 三、物理微边框系统 (1px Physical Border Model)

在暗色桌面环境中，界面的层级主要依靠 **1px 精确边框** 与 **底色明度差** 来拉开，而非依赖大投影：

```
┌─────────────────────────────────────────────────────────────┐
│ 面板容器 (canvas.subtle)                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 1px border: var(--borderColor-default) #30363d          │ │
│ │ 内嵌工作区/轨道 (canvas.inset)                           │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ 1px border: var(--borderColor-muted) #21262d        │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 边框层级与语义规则

```css
/* 1. 主边框：面板间切分、窗口顶栏分割、卡片外轮廓 */
.border-primer-default {
  border: 1px solid var(--borderColor-default); /* #30363d */
}

/* 2. 次级边框：轨道内横向分割、列表行分隔线、微调器内边 */
.border-primer-muted {
  border: 1px solid var(--borderColor-muted); /* #21262d */
}

/* 3. 高亮/激活边框：时间线选中片段、获得焦点输入框 */
.border-primer-accent {
  border: 1px solid var(--borderColor-accent); /* #1f6feb */
  box-shadow: 0 0 0 1px var(--borderColor-accent);
}
```

---

## 四、微阴影与深度层叠 (Elevation & Micro-Shadows)

在深色工程界面中，纯黑的大阴影极易造成脏感，GitHub Primer 采用微高光与内发光相结合的微投影模型：

```css
:root,
.dark {
  /* 1. 按钮常态微阴影（顶部 1px 微反光 + 底部极微阴影） */
  --shadow-primer-control: 0 1px 0 rgba(1, 4, 9, 0.4), inset 0 1px 0 rgba(240, 246, 252, 0.05);

  /* 2. 主按钮（GitHub 绿）微立体高光 */
  --shadow-primer-btn-primary: 0 1px 0 rgba(1, 4, 9, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15);

  /* 3. 下拉菜单与浮动工具条微浮起 */
  --shadow-primer-overlay: 0 4px 12px rgba(1, 4, 9, 0.5), 0 1px 3px rgba(1, 4, 9, 0.4);

  /* 4. 模态大弹窗深度投影 */
  --shadow-primer-dialog: 0 12px 32px rgba(1, 4, 9, 0.8), 0 2px 6px rgba(1, 4, 9, 0.6);
}
```

---

## 五、键盘导航与聚焦环规范 (Focus Visible Ring)

无障碍键盘操作是专业桌面编辑器的核心诉求。针对 Tab 键切换与快捷键导航，执行严格的 Primer 聚焦外环规范：

```css
/* 全局键盘聚焦环规范 */
:focus-visible {
  outline: 2px solid var(--accent-fg); /* #2f81f7 */
  outline-offset: 2px;
  box-shadow: 0 0 0 3px rgba(47, 129, 247, 0.3);
}

/* 紧凑输入框内部聚焦（避免 outline 挤占外侧轨道空间） */
.compact-input:focus-visible {
  outline: none;
  border-color: var(--accent-fg);
  box-shadow: 0 0 0 1px var(--accent-fg);
}
```

---

## 六、时间线专用形态微规范 (Timeline Specific Shapes)

1. **Clip 片段两端裁切把手**：
   - 裁切手柄宽度恒定 `6px`，内含 `radius-xsmall`（2px）微凹槽手柄纹理；
   - 鼠标悬停到边界 `±3px` 范围时，光标实时切换为双向裁切光标（`col-resize`），手柄高亮变白。
2. **播放头指针（Playhead Cursors）**：
   - 顶部标记头为 `12px × 16px` 倒水滴/倒梯形，底端带有 `2px` 锐利微针尖，确保对齐到具体帧；
   - 贯穿轨道的垂直参考线恒为 `1px solid var(--accent-fg)`（`#2f81f7`），硬件加速图层独立渲染无抗锯齿模糊。
3. **关键帧菱形标记（Keyframe Diamond）**：
   - 标准旋转 45 度的正方形（`8px × 8px`），具有 `1px` 圆角化顶点，选中态从半透明填充变为实心 `#ffffff` 填充加蓝色光晕。
