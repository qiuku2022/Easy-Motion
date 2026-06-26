# 02 — 工具清单与 Prompt

## 新增 Tool（6 个，M5.2 Phase 1）

| Tool | 说明 | 写入 |
|------|------|------|
| `listRemotionFiles` | 列出 `remotion/src` 下文件树（深度可限 4） | 否 |
| `readRemotionFile` | 读相对路径文件，可选 `offset`/`limit` | 否 |
| `writeRemotionFile` | 创建或覆盖文件（沙箱路径） | 是 |
| `patchRemotionFile` | 单次 search/replace（必须唯一匹配） | 是 |
| `registerCustomComponent` | 写 `custom/*.tsx` + 更新 `custom-registry.ts` + 可选挂 timeline | 是 |
| `compileRemotionCheck` | 跑 tsc，返回 success / errors | 否 |

Phase 2 可选：

| Tool | 说明 |
|------|------|
| `deleteRemotionFile` | 删 custom/ 下文件并更新 registry |
| `updateTimelineMetadata` | 改 timeline 的 fps/width/height/durationInFrames（**勿改 Root.tsx**，见 07 审查） |
| `searchRemotionDocs` | 检索 `docs/Remotion-doc` + `docs/Remotion-API` 本地镜像 |

## Tool Schema 示例

### writeRemotionFile

```typescript
{
  relativePath: string;  // 相对 remotion/src，如 "components/custom/ParticleBg.tsx"
  content: string;       // 完整文件内容
  reason?: string;       // 供 changeLog 展示
}
```

### registerCustomComponent

```typescript
{
  componentName: string;       // PascalCase，如 "ParticleBg"
  content: string;             // TSX 源码
  parameters?: Record<string, unknown>;  // 默认 props，写入 timeline clip.source.props
  startInFrames?: number;
  applyToTimeline?: boolean;   // 默认 true
}
```

### patchRemotionFile

```typescript
{
  relativePath: string;
  search: string;      // 必须唯一
  replace: string;
}
```

## System Prompt 增补（`prompts/remotion-code.js`）

追加章节（与 `prompts/system.js` 合并或条件注入）：

```
## Remotion 代码能力（用户项目内）

你可以读写当前用户 Remotion 项目的源码，根目录为：
{projectPath}/{subprojectPath}/remotion/src/

规则：
- 新自定义动画组件写在 components/custom/，PascalCase 文件名与 export 一致
- 用 registerCustomComponent 注册并（默认）添加到时间线 animation 轨道
- 修改已有 custom 组件用 readRemotionFile + patchRemotionFile 或 writeRemotionFile
- 禁止修改：MainSequence.tsx、presets/registry.ts、layers/、lib/、Root.tsx
- 分辨率/帧率/总时长：改 timeline 元数据（subproject.json），禁止直接改 Root.tsx（见 07-Remotion官方文档对齐审查.md）

Remotion 官方硬性规则（docs/Remotion-doc + docs/Remotion-API）：
- 动画必须用 useCurrentFrame()；禁止 CSS transition/animation、Tailwind 动画 class
- 数值动画用 interpolate(..., { extrapolateRight: "clamp" })；弹性用 spring({ fps, frame })
- 素材用 staticFile() + public/；图片/视频/音频用 <Img>、<OffthreadVideo>、<Html5Audio> 等
- Props 必须 JSON 可序列化（无函数）；parameters 写入 clip.source.props
- 组件内不要再包 <Sequence>（PreviewClipSequence 已处理）；frame 0 = 片段起点
- 仅 import 用户 remotion/package.json 中已安装的包（remotion、react；勿用 @remotion/shapes 等未安装包）

- 可 import 项目内 layers/*；禁止 fs、fetch、eval、动态 require
- 每次写入后应调用 compileRemotionCheck；失败则根据错误修正，不要声称已完成
- 可参考 searchRemotionDocs 检索 docs/Remotion-doc 与 docs/Remotion-API 本地镜像

与 timeline 工具协作：
- 简单文字/预设/背景 → 优先 timeline 工具（更快、可属性面板编辑）
- 复杂动画逻辑、粒子、自定义 SVG 路径 → Remotion custom 组件
- 同一需求不要既写 custom 又重复 createClip 文字轨
```

## Router 启发式（可选，`agent/router.js`）

```javascript
const CODE_INTENT =
  /组件|tsx|remotion|interpolate|spring|粒子|路径动画|自定义|源码|useCurrentFrame/i;
const TIMELINE_INTENT =
  /标题|预设|轨道|片段|背景|渐变|字体|大一点|删除|淡入/i;

function suggestAgentMode(input) {
  if (CODE_INTENT.test(input) && !TIMELINE_INTENT.test(input)) return "remotion-code";
  if (TIMELINE_INTENT.test(input) && !CODE_INTENT.test(input)) return "timeline";
  return "hybrid"; // 两套 tool 都挂载
}
```

M5.2 第一版：**默认 hybrid**（两套 tools 全挂），靠 prompt 引导选型。

## changeLog 扩展

`formatChangeSummary` 增加：

- `writeRemotionFile` → `创建/更新 Remotion 文件 components/custom/XXX.tsx`
- `registerCustomComponent` → `注册组件 XXX 并应用到时间线`
- `compileRemotionCheck` → 仅内部，不对用户展示除非失败

## IPC / UI

M5.2 **不必新增 IPC**；仍走 `main:conversation:send`。

`conversation:complete` _payload 扩展_：

```typescript
{
  timelineUpdated?: boolean;
  remotionCodeUpdated?: boolean;  // 新增
  remotionChangeSummary?: string; // 新增
  previewReload?: boolean;        // 现有；写 TSX 后可能 true
}
```

渲染进程 `conversationStore.handleConversationComplete`：若 `remotionCodeUpdated`，toast「Remotion 代码已更新」；预览 iframe 已有 HMR 则无需全量 reload。
