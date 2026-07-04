# 02 实施步骤

> 当前状态：Phase 0–6 已完成本地开发与自动化验证；待提交。发版前建议补跑 `pnpm build:win` 与安装包手测。

## Phase 0：准备与对齐

目标：确认 M11 第一版的实现边界。

步骤：

1. 以 `.local/m11-agent-visual-feedback-plan.md` 作为实施入口，暂不改正式 roadmap。
2. 确认 Remotion 版本仍使用项目内 `4.0.269`。
3. 确认缓存目录：

```text
<project>/<subproject>/.easymotion/agent-frames/
```

4. 确认第一版先不做实时 iframe 截图；Phase 6 已作为增强补齐。
5. 确认视觉复核允许额外调用一次多模态 LLM。
6. 明确错误处理：
   - 渲帧失败：工具返回失败，Agent 不得声称已看见画面。
   - 视觉分析失败：返回降级结果，不自动修正。
   - 导出中：默认拒绝渲帧。

交付：

- M11 方案确认。
- 任务拆分确认。

## Phase 1：主进程渲帧服务

目标：先不接 Agent，让主进程能稳定渲染指定帧。

新增：

```text
apps/electron/src/main/services/remotion-native-render.js
apps/electron/src/main/services/frame-render-service.js
```

实现步骤：

1. 先抽共享 Remotion native helper：
   - `getRemotionDir(projectPath, subprojectPath)`
   - `prepareRemotionForNativeSync(remotionDir)`
   - `isTimelineDrivenPreview(remotionSrcDir)`
   - `requireFromRemotion(remotionDir, "@remotion/bundler")`
   - `requireFromRemotion(remotionDir, "@remotion/renderer")`
   - `resolveBrowserExecutable()`
   - `resolveRemotionBinariesDirectory(remotionDir)`
   - `DEFAULT_COMPOSITION_ID`

2. 不要在 `frame-render-service` 里直接复制 `export-service.js` 的完整逻辑。导出和渲帧都需要 bundle/selectComposition，但语义不同：
   - 导出可以持久同步 timeline。
   - Agent 自检必须渲染本轮内存 timeline，不能提前写 `subproject.json`。

3. `renderFrame(request)` 必须接收 timeline：
   - `request.timeline` 来自 `TimelineContext` 当前内存态。
   - 仅服务外部手动调用时才允许 fallback 到 `timelineService.loadTimeline()`。
   - Agent tool 路径禁止 fallback 到磁盘 timeline。

4. 准备临时 manifest：
   - 对 `request.timeline` 执行 `fitTimelineDuration()` 和 `validateTimeline()`。
   - 读取并保存当前 `easymotion-timeline.manifest.json` 与 `preview-config.json` 内容。
   - 临时写入本轮 timeline 到 manifest，`updatedBy` 可为 `agent-frame-render`。
   - bundle 完成后恢复旧 manifest / preview-config。
   - 如果旧文件不存在，bundle 后删除临时文件。
   - 不调用 `timelineService.syncPreviewManifest()`，因为它会写 `subproject.json`。

5. 同步渲染运行时补丁：
   - 调用 `ensureLayerKeyframesImport(remotionDir)`。
   - 调用 `preview-service.ensurePreviewSoloSupport(remotionDir)`。
   - 调用 `preview-service.ensureCustomComponentSupport(remotionDir)`。
   - 这些是 Agent 自检前必须具备的 MainSequence/自定义组件支持，不能等 `agent-service.applyAgentTimelinePreview()` 才执行。

6. 使用 `bundle()`：
   - entry point 使用 `src/remotion-entry.tsx`。
   - bundle 输出到临时目录，如 `remotion/.easymotion/frame-bundle-${renderId}`。

7. 使用 `selectComposition()`：
   - composition id 使用 `DEFAULT_COMPOSITION_ID`。
   - `inputProps` 传入当前 timeline。
   - 传入 `browserExecutable` 和 `binariesDirectory`，与导出保持一致。

8. 使用 `renderStill()`：
   - frame 使用校验后的 frame。
   - image format 第一版只支持 `png`。
   - output 写入 `agent-frames`。
   - `inputProps` 同样传入当前 timeline。
   - `overwrite: true`。

9. 写入 metadata：
   - frame。
   - width/height。
   - bytes。
   - sha256。
   - createdAt。
   - renderId。

10. 清理临时 bundle：
   - finally 中删除。
   - 删除失败只记录，不阻断。

11. 实现并发锁：
   - `activeFrameRender` 全局变量。
   - 如果已有 active render，返回错误。
   - 如果 `export-service.getActiveExport()` 存在，返回错误。

12. 实现超时：
   - bundle 阶段建议 60s。
   - renderStill 阶段建议 45s。
   - 超时清理临时目录。
   - 这要求 Agent stream idle timeout 同步调整，否则 30 秒 idle 会先打断工具。

13. 实现缓存清理：
   - 最多保留最近 50 张。
   - 或总大小超过 100MB 时删除最旧文件。

建议 API：

```js
async function renderFrame(request, options = {}) {}
function getFrameRender(renderId) {}
async function cleanupFrameRenders(projectPath, subprojectPath, options = {}) {}
function getActiveFrameRender() {}
```

## Phase 2：Agent `renderFrame` 工具

目标：Agent 能显式调用渲帧能力。

新增：

```text
apps/electron/src/main/agent/tools/vision-feedback.js
```

推荐同时新增：

```text
apps/electron/src/main/agent/vision-feedback-context.js
```

实现步骤：

1. 创建 `VisionFeedbackContext`：
   - 接收 `timelineCtx` 或 `getTimeline()`，不要只保存初始化时的 timeline 快照。
   - 接收 `projectPath`、`subprojectPath`、`currentFrame`。
   - 注入 `frameRenderService`，测试可替换 fake。
   - 记录 `renderCount` 和 `visualChecks`。

2. 实现 `renderFrame` tool：
   - schema 支持 `frame`、`timeSeconds`、`scale`、`reason`。
   - `frame` 优先。
   - `timeSeconds` 按 fps 转 frame。
   - 默认用 `currentFrame`。
   - 每轮最多 2 次。
   - 调用 service 时传入 `timelineCtx.timeline` 当前值。

3. 在 `graph.js` 挂载：
   - timeline tools。
   - remotion tools。
   - vision feedback tools。

4. 更新 tool list prompt：
   - 新增 `renderFrame`。
   - 明确它用于视觉自检，不用于导出视频。
   - 明确如果本轮写了 Remotion 自定义代码，先调用 `compileRemotionCheck`，再调用 `renderFrame`。

5. 工具失败策略：
   - 返回 `{ success: false, error }`。
   - 记录到 context。
   - 不抛出到整个 Agent，除非参数明显非法。

交付：

- Agent 工具列表包含 `renderFrame`。
- fake service 测试通过。

## Phase 3：视觉复核工具

目标：Agent 能得到结构化视觉判断。

新增：

```text
apps/electron/src/main/agent/frame-inspector.js
```

实现步骤：

1. 实现图片读取：
   - 通过 `renderId` 从 `frame-render-service` 取 metadata。
   - 或接收受控 `imagePath`。
   - 校验路径必须位于 `agent-frames` 目录内。

2. 构造多模态消息：
   - 可复用 `buildMultimodalHumanMessage()`。
   - 如果现有函数不适合绝对路径，新增 `buildMultimodalHumanMessageFromAbsolutePaths()`。

3. 编写复核 prompt：
   - 输入用户目标。
   - 输入当前 timeline 摘要。
   - 输入检查项。
   - 要求只输出 JSON。

4. 调用模型：
   - `createChatModel({ temperature: 0.1 })`。
   - 支持测试注入 fake model。

5. 解析结果：
   - 复用 `extractJsonFromText()`。
   - 非 JSON 返回降级结果。

6. 新增 `verifyFrameAgainstGoal` tool：
   - 输入 `renderId`、`goal`、`checks`。
   - 每轮最多 2 次。
   - 返回 `pass`、`confidence`、`summary`、`issues`、`suggestedToolActions`。

交付：

- fake vision model 可测。
- 无 API Key 测试可跑。
- 有 API Key 可手测画面复核。

## Phase 4：Prompt 与 Agent 自检策略

目标：让 Agent 在合适场景主动自检。

更新：

```text
apps/electron/src/main/agent/prompts/system.js
```

新增规则：

- 当用户明确要求视觉结果、布局、颜色、位置、预设效果，且本轮已修改 timeline 或 Remotion 代码时，完成前优先调用 `renderFrame` + `verifyFrameAgainstGoal` 自检一次。
- 简单查询、导出状态、删除、批量 dryRun 不需要视觉自检。
- 渲帧失败时如实说明，不要声称“已看到画面”。
- 自检发现问题时最多修正一次。
- 修正后可再次渲帧确认，但总渲帧次数不超过 2。
- 导出中或渲帧资源繁忙时，跳过自检并说明原因。
- 修改 Remotion 自定义源码后，视觉自检前先 `compileRemotionCheck`；编译失败时不渲帧，按 M5.2 回滚/重试策略处理。

代码层限制：

- `renderFrame` 每轮最多 2 次。
- `verifyFrameAgainstGoal` 每轮最多 2 次。
- `confidence < 0.6` 不建议自动修正。
- vision tools 挂载后，`streamAgentWithTimeouts()` 的 `chunkIdleMs` 不能仍固定 30 秒。建议第一版在 `runAgentAttempt()` 调用处传入 `chunkIdleMs: 120_000`，或仅在启用 vision tools 时放宽。

第一版不做外层强制 orchestrator。若 prompt 驱动不稳定，下一阶段再考虑：

```text
runAgentAttempt()
  -> 保存 timeline/remotion
  -> render + verify
  -> issues 明确时构造 retry prompt 再跑一次
```

## Phase 5：对话结果透传

目标：让用户知道是否做了视觉自检。

修改：

- `apps/electron/src/main/agent/index.js`
- `apps/electron/src/main/services/agent-service.js`
- 可能涉及 renderer conversation 类型。

实现步骤：

1. `VisionFeedbackContext` 记录：
   - 渲染帧。
   - 验证结果。
   - 失败原因。

2. Agent result 增加：

```ts
visualChecks?: VisualCheckSummary[]
```

3. `conversation:complete` 透传 `visualChecks`。

4. 第一版 UI 可只展示文字：
   - “已自检第 30 帧：标题可见，颜色符合要求。”
   - “视觉自检失败：渲帧超时，已完成时间线修改但未确认画面。”

5. 若要展示缩略图，另开受控 IPC：
   - `main:conversation:readAgentFramePreview`
   - 不直接暴露任意绝对路径。

## Phase 6：后置增强

状态：已实现第一版。

### `seekPlayhead`

已实现流程：

```text
Agent tool
  -> main broadcast renderer:preview:seek-requested
  -> renderer PreviewWindow / playbackStore.seekTo(frame)
  -> renderer 调 main:preview:seekCompleted ACK
```

实现位置：

- `apps/electron/src/main/agent/tools/vision-feedback.js`
- `apps/electron/src/main/agent/vision-feedback-context.js`
- `apps/electron/src/main/services/preview-capture-service.js`
- `apps/electron/src/main/ipc-handlers/preview.js`
- `apps/electron/src/preload/index.js`
- `apps/electron/src/renderer/src/components/preview/PreviewWindow.tsx`

### `capturePreview`

已实现第一版。

采用路线：

- renderer `PreviewWindow` 使用 `getBoundingClientRect()` 上报预览画面区域。
- main 通过 `BrowserWindow.capturePage(rect)` 截取该区域。
- 截图写入 `<project>/<subproject>/.easymotion/agent-frames/`，生成 PNG + JSON metadata。
- `capturePreview` 返回的 `renderId` 可继续交给 `verifyFrameAgainstGoal`。
- renderer 不接触文件系统，文件写入和路径校验仍在主进程。

已知限制：

- 依赖当前 Electron 预览窗口可见、预览 iframe 已加载。
- 受窗口布局、缩放、遮挡影响；失败时 Agent 应退回 `renderFrame` 或如实说明未完成视觉确认。
- preview iframe 内部截图路线暂未实现，可作为后续精度增强。
