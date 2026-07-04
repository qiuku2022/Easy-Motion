# 03 测试与验收

> 当前状态：M11 本地自动化验证已通过；发版前仍建议补跑 `pnpm build:win` 与安装包手测。

## 1. 测试原则

M11 涉及 Remotion 渲帧和多模态 LLM，但自动化测试不能依赖 API Key，也不能要求每次都真实启动浏览器渲染。

因此测试分三层：

1. **无 API Key 单元测试**：fake renderer / fake vision model，必须进 `test:m11`。
2. **本地集成测试**：可选真实 Remotion renderStill，开发者手动跑。
3. **人工验收**：有 API Key 时手测 Agent 视觉自检闭环。

## 2. 新增脚本

修改：

```text
apps/electron/package.json
```

新增：

```json
{
  "test:m11": "node tests/test-remotion-native-render.js && node tests/test-frame-render-service.js && node tests/test-preview-capture-service.js && node tests/test-agent-vision-feedback-tools.js"
}
```

根目录如需统一代理，可后续补：

```json
{
  "test:m11": "pnpm --filter @easymotion/electron test:m11"
}
```

是否把 `test:m11` 加入默认 `pnpm test`，等 M11 稳定后再决定。第一阶段可以先不加，避免真实渲帧路径误入默认测试。

## 3. `test-remotion-native-render.js`

前置建议新增：

```text
apps/electron/tests/test-remotion-native-render.js
```

覆盖共享 helper：

- 能注入 fake `bundle` / `selectComposition` / `renderStill`。
- 能传递 `browserExecutable` 和 `binariesDirectory`。
- 临时 bundle 目录能清理。
- helper 不依赖根目录 Remotion 包。

## 4. `test-frame-render-service.js`

路径：

```text
apps/electron/tests/test-frame-render-service.js
```

覆盖：

- 参数校验：
  - frame 必须是整数。
  - frame 不得小于 0。
  - frame 不得超过 `durationInFrames - 1`。
  - scale 只允许白名单值。

- 路径安全：
  - 缓存目录必须位于当前子项目 `.easymotion/agent-frames/`。
  - 不接受越界路径。
  - 清理只清理 agent-frames 目录内文件。

- timeline 来源：
  - Agent 路径必须使用传入的内存 timeline。
  - fake `timelineService.loadTimeline()` 如被调用则测试失败。
  - `renderFrame` 传入的 inputProps 是当前内存 timeline。

- 临时 manifest：
  - 渲帧前临时写入本轮 timeline。
  - bundle 完成后恢复原 manifest / preview-config。
  - 不调用 `timelineService.syncPreviewManifest()`。
  - 不提前写 `subproject.json`。

- 并发锁：
  - active render 存在时第二次调用失败。
  - 失败后锁会释放。

- 导出冲突：
  - fake `exportService.getActiveExport()` 返回 active 时，渲帧拒绝。

- fake renderer：
  - 注入 fake `bundle` / `selectComposition` / `renderStill`。
  - 能写出一张测试 PNG 或伪文件。
  - metadata 包含 `renderId`、`frame`、`bytes`、`sha256`。

- 清理策略：
  - 超过数量限制删除旧文件。
  - 超过大小限制删除旧文件。

## 5. `test-preview-capture-service.js`

路径：

```text
apps/electron/tests/test-preview-capture-service.js
```

覆盖：

- renderer 上报 preview frame bounds 后，main 可保存截图区域。
- `requestPreviewSeek()` 会向 renderer 发送 `renderer:preview:seek-requested`。
- `resolvePreviewSeek()` 可解析 renderer ACK。
- `capturePreview()` 会：
  - 请求 seek 指定 frame。
  - 使用已注册 rect 调 `capturePage()`。
  - 写入 PNG 和 JSON metadata。
  - 缓存 metadata，供 `verifyFrameAgainstGoal` 按 `renderId` 读取。

## 6. `test-agent-vision-feedback-tools.js`

路径：

```text
apps/electron/tests/test-agent-vision-feedback-tools.js
```

覆盖：

- tools 包含：
  - `renderFrame`
  - `seekPlayhead`
  - `capturePreview`
  - `verifyFrameAgainstGoal`

- `renderFrame`：
  - 默认使用 `currentFrame`。
  - `timeSeconds` 按 fps 转 frame。
  - `frame` 优先级高于 `timeSeconds`。
  - 无 `projectPath` 返回错误。
  - fake frame service 被正确调用。
  - service 收到的是 `timelineCtx.timeline` 最新引用/快照，而不是初始化时旧 timeline。
  - 每轮超过 2 次返回失败。

- `verifyFrameAgainstGoal`：
  - fake inspector 返回 JSON，工具透传成功。
  - fake inspector 返回解析失败，工具返回降级结果。
  - renderId 不存在返回错误。
  - 可读取 `renderFrame` 或 `capturePreview` 产生的 metadata。
  - 每轮超过 2 次返回失败。

- `visualChecks`：
  - context 能记录渲帧与复核结果。
  - context 能记录实时预览 seek 与 capture 结果。
  - `getVisualChecks()` 返回可序列化对象。

## 7. Prompt Regression

修改：

```text
apps/electron/tests/test-agent-prompt-regression.js
```

新增断言：

- system prompt 提到 `renderFrame`。
- system prompt 提到 `seekPlayhead`。
- system prompt 提到 `capturePreview`。
- system prompt 提到 `verifyFrameAgainstGoal`。
- system prompt 明确视觉自检失败时不能声称已看到画面。
- system prompt 明确每轮渲帧次数上限或“有限自检”原则。
- system prompt 明确导出中/资源繁忙时跳过并说明。
- system prompt 明确 Remotion 自定义代码修改后先 `compileRemotionCheck` 再渲帧。

## 8. Agent Stream Timeout

修改或新增测试：

```text
apps/electron/tests/test-agent-vision-timeout.js
```

覆盖：

- vision tools 启用时，`streamAgentWithTimeouts()` 的 `chunkIdleMs` 被放宽，不能仍是 30 秒。
- fake long-running tool 45 秒内不应触发 `E2810`。
- 未启用 vision tools 的普通 Agent 流程仍保留现有超时默认值。

如不新增独立测试，也至少在 `test-agent-vision-feedback-tools.js` 中断言 `runAgentAttempt()` 传入了更长 idle 配置。

## 9. Agent Service Flow

可选修改：

```text
apps/electron/tests/test-agent-service-flow.js
```

覆盖：

- Agent result 中包含 `visualChecks` 时，`conversation:complete` payload 透传。
- `visualChecks` 缺省时不影响现有流程。
- 视觉自检失败时 `systemNotice` 或完成消息能包含说明。

## 10. 真实渲帧集成测试

第一版不强制进 `test:m11`，但建议提供单独脚本或手动测试步骤。

场景：

1. 创建临时项目或使用 default project fixture。
2. 写入简单 timeline：黑底 + 白色标题。
3. 调用 `frame-render-service.renderFrame({ frame: 0 })`。
4. 确认输出 PNG 存在且非空。
5. 确认临时 bundle 被清理。

注意：

- 这类测试可能依赖浏览器、Remotion native deps、Windows 路径和首次 install，不适合默认 CI。

## 11. 人工验收

### 场景 1：标题创建后自检

输入：

```text
创建一个白色标题“Hello”，放在画面中央，并自检画面。
```

预期：

- Agent 创建 text clip。
- Agent 调用 `renderFrame`。
- `renderFrame` 画面包含本轮刚创建的标题，而不是磁盘旧 timeline。
- Agent 调用 `verifyFrameAgainstGoal`。
- 完成消息说明已自检。
- 画面中标题可见，颜色和位置基本正确。

### 场景 2：颜色错误纠正

准备：

- 当前画面已有标题，但颜色不是用户要求颜色。

输入：

```text
把标题改成纯白色，完成前看一下画面确认。
```

预期：

- Agent 定位标题。
- Agent 修改 `style.color`。
- Agent 渲帧复核。
- 如果复核发现仍不对，最多修正一次。

### 场景 3：渲帧失败降级

准备：

- 模拟 Remotion 依赖缺失或 renderer 抛错。

预期：

- Agent 完成能完成的 timeline 修改。
- Agent 明确说明“视觉自检失败/未确认画面”。
- 不出现“已看到画面”“确认无误”等虚假话术。

### 场景 4：导出中拒绝渲帧

准备：

- 启动视频导出。

输入：

```text
检查一下当前画面标题是否居中。
```

预期：

- `renderFrame` 返回导出中不能渲帧。
- Agent 说明原因。
- 不启动第二个渲染任务。

### 场景 5：取消/失败不污染项目文件

准备：

- 让 Agent 在内存中创建标题后触发渲帧。
- 渲帧后模拟 Agent 取消或视觉模型失败。

预期：

- `subproject.json` 不会因为渲帧工具提前写入错误 timeline。
- 旧 manifest / preview-config 在 bundle 后恢复，或最终由成功保存流程重新同步。

### 场景 6：实时预览截图

准备：

- 打开项目并确保预览窗口已加载。

输入：

```text
跳到第 30 帧，看一下当前预览画面标题是否居中。
```

预期：

- Agent 可调用 `seekPlayhead` 跳到目标帧。
- Agent 可调用 `capturePreview` 截取当前可见预览画面。
- Agent 可调用 `verifyFrameAgainstGoal` 复核截图。
- 如果预览窗口不可见或截图失败，Agent 应退回 `renderFrame` 或明确说明未完成实时预览截图确认。

## 12. 最终验证命令

M11 已跑并通过：

```bash
pnpm test:m11
pnpm --filter @easymotion/electron test:m11
pnpm --filter @easymotion/electron test:m5
pnpm --filter @easymotion/electron test:m5.2
pnpm lint
pnpm --filter @easymotion/electron build:renderer
pnpm test
```

如果改动涉及真实 Remotion 渲帧路径、打包路径或 native renderer：

```bash
pnpm build:win
```

## 13. 验收标准

通过标准：

- `renderFrame` 能在受控目录输出 PNG。
- `renderFrame` 渲染本轮内存 timeline，不读旧磁盘 timeline。
- `renderFrame` 不调用会提前写 `subproject.json` 的 `syncPreviewManifest()`。
- `verifyFrameAgainstGoal` 能返回结构化 JSON。
- `seekPlayhead` 能请求 renderer 跳转实时预览播放头。
- `capturePreview` 能截取 Electron 当前可见预览区域并写入受控缓存目录。
- vision tool 长耗时不会被 30 秒 Agent idle timeout 误杀。
- 无 API Key 自动化测试全过。
- 有 API Key 手测能完成一次视觉自检闭环。
- 渲帧失败、视觉失败、导出中冲突都能降级。
- 不新增 Electron 进程边界违规。
- 不新增 renderer 直接文件访问。
- 不破坏 M5 / M5.2 工具链。
