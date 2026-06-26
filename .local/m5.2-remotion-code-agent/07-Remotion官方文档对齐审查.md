# 07 — Remotion 官方文档对齐审查

> 审查日期：2026-06-24  
> 对照：`docs/Remotion-doc/`（45 页）、`docs/Remotion-API/`（288 API）、用户项目模板 `remotion@4.0.269`  
> 结论：**M5.2 总体可行**，架构（custom 组件 + timeline 挂载 + 沙箱）与 Remotion 官方模式兼容；需修订 Prompt、编译校验、元数据路径三处。

---

## 总体结论

| 维度 | 判定 | 说明 |
|------|------|------|
| 沙箱写 `components/custom/` | ✅ 可行 | 符合 [Reusability](https://www.remotion.dev/docs/reusability)「可复用 React 组件」模式 |
| `registerCustomComponent` + timeline animation 轨 | ✅ 可行 | 等同 [Parameterized rendering](https://www.remotion.dev/docs/parameterized-rendering) 的 props 注入；`clip.source.props` ↔ `defaultProps` |
| `PreviewClipSequence` + `<Sequence>` | ✅ 已对齐 | 与官方 [Sequence](https://www.remotion.dev/docs/sequence) 时间偏移一致；custom 组件内 `useCurrentFrame()` 从 0 起算 |
| 不改 `MainSequence` / `Root.tsx` | ✅ 正确 | EasyMotion 预览走 timeline 驱动；Composition 元数据另有同步路径（见下） |
| 仅 `tsc` 编译检查 | ⚠️ 需加强 | 应用 Vite 预览链 + 可选 ESLint 规则 |
| Prompt 中的 API 列表 | ⚠️ 需修订 | 须写入官方硬性规则（禁 CSS 动画等） |
| `updateComposition` 改 Root.tsx | ❌ 建议取消 | 与 EasyMotion timeline 元数据双源冲突 |

---

## 与 EasyMotion 用户项目结构的契合

用户 Remotion 项目（非 monorepo）实际结构符合 [Brownfield](https://www.remotion.dev/docs/brownfield)：

```
{用户.em}/subprojects/default/remotion/
├── package.json          # remotion 4.0.269
├── public/               # staticFile() 根
└── src/
    ├── Root.tsx          # <Composition id="Main" component={MainSequence} />
    ├── preview-entry.tsx # @remotion/player + TIMELINE_UPDATE
    └── components/MainSequence.tsx  # timeline JSON → 动态渲染
```

**关键代码路径**（`MainSequence.tsx`）：

- animation 片段 → `resolvePresetComponent(name)` → `<PresetComponent {...clip.source.props} />`
- 外包 `PreviewClipSequence` → 内部 `<Sequence from durationInFrames>`

M5.2 的 `custom-registry.ts` + `resolveCustomComponent` 应插在 `resolvePresetComponent` 失败之后，**不改变**上述 Sequence 语义。

---

## 官方文档要求的 Prompt 修订（必做）

来源：[animating-properties.md](../../docs/Remotion-doc/animating-properties.md)、[remotion-best-practices SKILL](../../.agents/skills/remotion-best-practices/SKILL.md)

Agent 写 custom 组件时必须遵守：

1. **动画必须用 `useCurrentFrame()`** — 禁止 CSS `transition`/`animation`、Tailwind 动画 class（渲染会 flicker）
2. **数值动画优先 `interpolate()`**，并设 `extrapolateRight: "clamp"`（及 Left 如需要）
3. **弹性动画用 `spring({ fps, frame })`** — `fps` 来自 `useVideoConfig()`
4. **素材路径用 `staticFile()`** — `public/` 在 remotion 包根目录（与 [staticFile()](../../docs/Remotion-API/staticfile.md) 一致）
5. **图片/视频/音频用 Remotion 组件** — `<Img>`、`<OffthreadVideo>`/`<Video>`、`<Html5Audio>` 等，非原生标签裸路径
6. **Props 必须 JSON 可序列化** — 与 [Composition defaultProps](../../docs/Remotion-API/composition.md) 相同限制；禁止函数 props
7. **组件内不要再包 `<Sequence>`** — 时间轴已由 `PreviewClipSequence` 处理；组件内 frame 0 = 片段起点
8. **帧范围** — 第一帧 0，最后一帧 `durationInFrames - 1`（[the-fundamentals](../../docs/Remotion-doc/the-fundamentals.md)）

### 依赖白名单（读用户 `remotion/package.json` 动态生成）

当前模板**仅有**：

```json
"remotion", "@remotion/player", "@remotion/bundler", "@remotion/renderer", "@remotion/media-parser"
```

**禁止** Agent import 未安装的包，例如：

- `@remotion/shapes`、`@remotion/transitions`、`@remotion/three`、`@remotion/skia` 等

实现：`remotion-sandbox.js` 增加 `getAllowedImports(remotionDir)`，写入前扫描 import 路径。

---

## 需修改的原方案条目

### 1. 取消 Phase 2 的 `updateComposition`（改 Root.tsx）

**原因**：

- Generator 版 `Root.tsx` 从 `easymotion-timeline.manifest.json` 读 fps/宽高/时长（`generate-root.js`）
- 模板版 `Root.tsx` 写死 metadata，但预览实际靠 Player `inputProps.timeline`
- Agent 直接改 Root.tsx 会造成 **timeline JSON 与 Composition metadata 双源不一致**

**改为**：

- 分辨率/时长/帧率 → 现有 **timeline 工具**或新增 `updateTimelineMetadata`（改 `subproject.json` 内 timeline 字段）
- 保存 timeline 后走现有 `syncPreviewManifest` / manifest 推送

### 2. 加强 `compileRemotionCheck`

| 层级 | 手段 |
|------|------|
| L1 | `assertTsxSecurity`（已有） |
| L2 | import 白名单（上节） |
| L3 | `npx tsc --noEmit -p tsconfig.json`（用户 remotion 目录） |
| L4（推荐） | 对用户 remotion 跑 `npm run preview:dev -- --host 127.0.0.1` 健康检查或 Vite `build --mode development`（超时 90s） |
| L5（M5.3） | `@remotion/eslint-plugin` 规则子集（[brownfield ESLint](../../docs/Remotion-doc/brownfield.md)） |

`node_modules` 缺失时：预览启动流程已有 `ensureRemotionDeps`，compile 前调用。

### 3. 新增 `readRemotionDoc` / 注入本地文档（推荐 Phase 2）

Remotion 官方 [AI 文档](https://www.remotion.dev/docs/ai/) 建议用 MCP / Skills / System Prompt 教模型 API 规则。

EasyMotion 已有本地镜像，建议：

```javascript
// agent/remotion-docs-index.js — 轻量关键词 → 文件路径
searchRemotionDocs({ query: "spring" })
// → 返回 docs/Remotion-API/spring.md 摘要（截断 80 行）
```

或在 `prompts/remotion-code.js` 启动时注入 **固定必读摘要**（fundamentals + animating-properties + staticFile，各 ≤30 行）。

产品 Agent 可复用 `.agents/skills/remotion-best-practices/rules/*.md` 中与用户项目相关的条目（非 Cursor 专属部分）。

### 4. `registerCustomComponent` 组件脚手架

生成代码应符合官方最小模式：

```tsx
import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig } from "remotion";

export type ParticleBgProps = {
  color?: string;
  particleCount?: number;
};

export const ParticleBg: React.FC<ParticleBgProps> = ({
  color = "#ff006e",
  particleCount = 40,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ backgroundColor: "#121212", opacity }}>
      {/* ... */}
    </AbsoluteFill>
  );
};
```

`parameters` → `clip.source.props` → spread 到组件（与 [Parameterized rendering](../../docs/Remotion-doc/parameterized-rendering.md) 一致）。

### 5. 能力边界说明（写入 00-概述）

M5.2 **能**：

- 在 animation 轨挂载 custom Remotion 组件（单片段粒度）
- 读写 `components/custom/*.tsx`
- 通过 props 参数化（属性面板可编辑）

M5.2 **不能**（留 M5.3+）：

- 整片替换 `MainSequence` 为多 Composition 编排（需 `<Series>` / `<TransitionSeries>` 整片架构）
- 使用未安装 Remotion 扩展包（shapes、three、Lottie…）
- `calculateMetadata()` 动态时长（需 Generator + manifest 联动）

---

## 版本说明

| 来源 | 版本 |
|------|------|
| 用户项目模板 | remotion **4.0.269** |
| docs 爬取日期 | 2026-05-29（文中 brownfield 示例提到 4.0.469） |

Prompt 应注入用户项目 `package.json` 中的**实际** remotion 版本，避免 API 幻觉。

---

## 修订后的 Phase 优先级

| 原 Phase | 修订 |
|----------|------|
| Phase 1 | 不变 + import 白名单 + 官方 Prompt 规则 |
| Phase 2 | 去掉 `updateComposition`；加 `updateTimelineMetadata`（可选）；加 `searchRemotionDocs` |
| Phase 3 | 加 `@remotion/eslint-plugin` 子集；文档回写 `docs/requirements/LLM-Agent设计.md` |

---

## 审查签字

- [x] 对照 Remotion-doc 核心概念（fundamentals、composition、sequence、parameterized）
- [x] 对照 Remotion-API 常用 API（useCurrentFrame、interpolate、spring、staticFile、Img）
- [x] 对照用户项目模板 MainSequence / PreviewClipSequence 实际行为
- [x] 方案可行，需按上文 5 条修订后实施
