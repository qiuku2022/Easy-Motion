# 01 架构设计

## 1. 推荐架构

M11 第一版采用“主进程离屏渲帧 + 工具内部视觉复核”的架构。

```text
Agent 调用 timeline/remotion 写工具
  ↓
Agent 调用 renderFrame({ frame, reason })
  ↓
renderFrame 读取 TimelineContext 当前内存态
  ↓
frame-render-service 使用 Remotion renderStill 渲染图片
  ↓
Agent 调用 verifyFrameAgainstGoal({ renderId, goal, checks })
  ↓
frame-inspector 调用多模态模型分析截图
  ↓
返回结构化 JSON
  ↓
Agent 决定是否调用已有工具修正
```

## 2. 为什么不直接返回 base64

当前 LangChain tools 返回 JSON 字符串。把图片 base64 塞进 tool result 有三个问题：

- 上下文开销大。
- 模型不一定把 JSON 字符串里的 data URL 当图片输入解析。
- 不利于测试、缓存和限额控制。

因此第一版让 `verifyFrameAgainstGoal` 工具内部调用多模态模型，工具只向 Agent 返回结构化判断结果。

## 3. 关键代码约束

当前实现里，Agent 写工具只先修改 `TimelineContext` 内存对象。真正保存到 `subproject.json` 发生在 `agent-service.js` 收到 `runAgent()` 结果之后：

```text
runAgentAttempt()
  -> TimelineContext 内存变更
  -> Agent 可继续调用工具
  -> runAgent 返回
  -> agent-service.saveTimeline()
```

所以 `renderFrame` 不能按导出逻辑重新从磁盘 `timelineService.loadTimeline()`。否则 Agent 刚创建或修改的元素不会出现在自检画面里。

另一个现状是 `timelineService.syncPreviewManifest()` 会写 `subproject.json`。它适合导出和预览同步，不适合 Agent 工具链中途自检。M11 自检需要：

- 从 `TimelineContext` 读取本轮内存 timeline。
- 对该 timeline 做 `fitTimelineDuration()` / `validateTimeline()`。
- 临时写 `easymotion-timeline.manifest.json` 和 `preview-config.json` 供 bundle 使用。
- bundle 完成后恢复旧 manifest / preview-config。
- 不提前写 `subproject.json`。

## 4. 新增模块

### `remotion-native-render.js`

路径：

```text
apps/electron/src/main/services/remotion-native-render.js
```

职责：

- 抽出 `export-service.js` 和 M11 frame render 共有的 Remotion native 准备逻辑。
- 统一处理：
  - `prepareRemotionForNativeSync()`
  - `bundle()`
  - `selectComposition()`
  - `resolveBrowserExecutable()`
  - `resolveRemotionBinariesDirectory()`
  - `DEFAULT_COMPOSITION_ID`
  - 临时 bundle 目录清理

当前已有 `evaluateMainComposition()`，但它没有处理 timeline inputProps、browserExecutable、binariesDirectory，也不适合直接承担 M11 渲帧。建议新增 helper 后，导出服务可逐步迁移，避免复制导出里的 bundle/selectComposition 细节。

### `frame-render-service.js`

路径：

```text
apps/electron/src/main/services/frame-render-service.js
```

职责：

- 准备 Remotion 项目。
- 渲染调用方传入的 timeline。
- 使用临时 timeline manifest，不提前写 `subproject.json`。
- bundle Remotion entry。
- 调用 `renderStill()`。
- 输出 PNG 到受控缓存目录。
- 管理并发锁、超时、清理。

建议导出：

```js
async function renderFrame(request, options = {}) {}
function getFrameRender(renderId) {}
async function cleanupFrameRenders(projectPath, subprojectPath, options = {}) {}
function getActiveFrameRender() {}
```

### `frame-inspector.js`

路径：

```text
apps/electron/src/main/agent/frame-inspector.js
```

职责：

- 读取渲帧图片路径。
- 构造多模态消息。
- 调用 `createChatModel({ temperature: 0.1 })`。
- 强制模型返回 JSON。
- 解析失败时返回可降级结果。

建议导出：

```js
async function verifyFrameAgainstGoal(input, options = {}) {}
async function inspectFrame(input, options = {}) {}
```

### `tools/vision-feedback.js`

路径：

```text
apps/electron/src/main/agent/tools/vision-feedback.js
```

职责：

- 注册 `renderFrame`。
- 注册 `verifyFrameAgainstGoal`。
- 可选注册 `inspectFrame`。
- 维护每轮工具调用限额。

### `VisionFeedbackContext`

推荐新增独立 context，而不是继续把 `TimelineContext` 变胖。

职责：

- 持有 `projectPath`、`subprojectPath`、`timeline`、`currentFrame`。
- 持有 `timelineCtx` 引用或 `getTimeline()` 回调，确保每次渲染拿到最新内存态。
- 可选持有 `remotionCtx` 引用，用于判断 Remotion 源码是否有未编译变更。
- 注入 `frameRenderService` 与 `frameInspector`，方便测试 fake。
- 记录 `renderCount`、`verifyCount`、`visualChecks`。
- 提供 `getVisualChecks()` 给 `agent-service` 透传。

## 5. `renderFrame` 工具

输入 schema：

```ts
{
  frame?: number;
  timeSeconds?: number;
  scale?: 0.5 | 1;
  reason?: string;
}
```

解析规则：

- `frame` 优先。
- `timeSeconds` 按 timeline fps 转换为 frame。
- 都不传时使用 `currentFrame ?? 0`。
- frame clamp 不建议静默做，越界应返回错误，避免 Agent 误判。

返回示例：

```json
{
  "renderId": "frame-1710000000000-a1b2c3",
  "frame": 30,
  "subprojectPath": "subprojects/default",
  "image": {
    "relativePath": ".easymotion/agent-frames/frame-1710000000000-a1b2c3.png",
    "absolutePath": "D:/.../subprojects/default/.easymotion/agent-frames/frame-1710000000000-a1b2c3.png",
    "mime": "image/png",
    "width": 1280,
    "height": 720,
    "bytes": 123456,
    "sha256": "..."
  },
  "timelineSummary": {
    "fps": 30,
    "durationInFrames": 300
  }
}
```

注意：

- tool result 可以包含 `absolutePath` 供主进程继续使用。
- conversation 持久化不应长期保存绝对路径。
- UI 若要展示缩略图，后续通过受控 IPC 读取。
- 如果本轮有 Remotion Code 修改，`renderFrame` 前应先 `compileRemotionCheck`；否则 bundle 失败只能作为自检失败处理，不能替代 M5.2 的编译回滚。

## 6. `verifyFrameAgainstGoal` 工具

输入 schema：

```ts
{
  renderId: string;
  goal: string;
  checks?: Array<"text" | "color" | "layout" | "visibility" | "style" | "animation">;
}
```

返回示例：

```json
{
  "pass": false,
  "confidence": 0.82,
  "summary": "标题存在，但颜色偏蓝，不符合用户要求的白色标题。",
  "issues": [
    {
      "kind": "style",
      "severity": "medium",
      "target": "标题文字",
      "expected": "白色文字",
      "observed": "浅蓝色文字"
    }
  ],
  "suggestedToolActions": [
    {
      "tool": "updateClip",
      "reason": "将标题文字颜色修正为白色",
      "paramsHint": {
        "updates": {
          "style.color": "#ffffff"
        }
      }
    }
  ]
}
```

原则：

- `suggestedToolActions` 只作为建议，不自动执行。
- 修正必须由 Agent 再显式调用现有 timeline/remotion 工具。
- `confidence < 0.6` 时不建议自动修正，只提示用户或说明不确定。

## 7. 与现有 Agent 集成

修改点：

- `graph.js`：创建 `VisionFeedbackContext` 并挂载 vision tools。
- `index.js`：收集 `visualChecks`，随 result 返回。
- `agent-service.js`：将 `visualChecks` 透传到 `conversation:complete`。
- `prompts/system.js`：补视觉自检规则与工具列表。
- `stream-timeout.js` 调用点：vision tools 可能让 tool execution 超过当前 30 秒 idle timeout，需要给 M11 场景更长 `chunkIdleMs` 或工具进度心跳。

第一版不要在 `runAgent()` 外层强制插入视觉重试。先使用：

- Prompt 约束。
- 工具限额。
- 工具返回结构化结果。

如果模型不稳定，再做 orchestrator 强制闭环。

## 8. 实时预览截图增强：`seekPlayhead` / `capturePreview`

`seekPlayhead` 已作为 renderer 播放状态请求实现：

```text
Agent tool
  -> main broadcast renderer:preview:seek-requested
  -> renderer playbackStore.seekTo(frame)
  -> renderer main:preview:seekCompleted ACK
```

`capturePreview` 已实现第一版：

- renderer `PreviewWindow` 上报预览 iframe 外层容器 rect。
- main `preview-capture-service` 调 `BrowserWindow.capturePage(rect)`。
- PNG 与 metadata 写入 `.easymotion/agent-frames/`。
- `verifyFrameAgainstGoal` 可通过 `renderId` 读取实时预览截图 metadata。
- renderer 不接触文件系统。

已知限制：

- 依赖当前 Electron 预览窗口可见、iframe 已加载。
- 受窗口布局、缩放、遮挡影响。
- 失败时 Agent 应退回 `renderFrame` 或明确说明未完成实时预览截图确认。
- preview iframe 内部截图协议暂未实现，可作为后续精度增强。
