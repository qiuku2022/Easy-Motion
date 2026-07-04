# 04 风险与决策

## 1. 已建议的默认决策

| 问题 | 建议 |
| --- | --- |
| 第一版是否做 iframe 实时截图 | 第一版先做 Remotion 离屏渲帧；Phase 6 已补 `capturePreview` 可见区域截图 |
| 截图如何进入 Agent 推理 | 不作为 tool result 图片返回，由视觉复核工具内部调用多模态模型 |
| 是否允许额外 LLM 调用 | 允许，但只在明确视觉任务中触发 |
| 每轮渲帧次数 | 最多 2 次 |
| 每轮视觉复核次数 | 最多 2 次 |
| 自检失败是否阻断修改 | 不阻断，但必须如实告知 |
| 缓存位置 | `<project>/<subproject>/.easymotion/agent-frames/` |
| 缓存保留 | 最近 50 张或 100MB |
| 导出中是否允许渲帧 | 第一版拒绝 |
| Agent 自检渲染哪个 timeline | 渲染 `TimelineContext` 当前内存态，不读磁盘旧状态 |
| 是否使用 `syncPreviewManifest()` | Agent 自检路径不使用，因为它会写 `subproject.json` |
| vision tool idle timeout | 放宽到足以覆盖 bundle/renderStill/视觉复核，建议 120 秒 |

## 2. 风险：渲染到旧 timeline

表现：

- Agent 刚创建标题后调用 `renderFrame`。
- `renderFrame` 从磁盘 `loadTimeline()`。
- 画面里没有刚创建的标题，视觉复核误判。

原因：

- 现有流程中，Agent 工具先改 `TimelineContext` 内存态。
- `agent-service.saveTimeline()` 在 `runAgent()` 返回后才发生。

处理：

- `VisionFeedbackContext` 持有 `timelineCtx` 或 `getTimeline()`。
- `renderFrame` service 接收 timeline 参数。
- Agent tool 路径禁止 fallback 到磁盘 timeline。
- 测试中 fake `loadTimeline()` 被调用即失败。

## 3. 风险：自检提前污染 `subproject.json`

表现：

- `renderFrame` 调用 `timelineService.syncPreviewManifest()`。
- 该函数会写 `subproject.json`。
- 如果 Agent 后续取消、失败或 Remotion 编译回滚，磁盘 timeline 可能被提前写入不应保存的状态。

处理：

- Agent 自检路径不调用 `syncPreviewManifest()`。
- 使用临时 `easymotion-timeline.manifest.json` / `preview-config.json`。
- bundle 完成后恢复旧文件。
- 成功完成后仍由 `agent-service.saveTimeline()` 和现有 preview apply 流程负责正式落盘。

## 4. 风险：`renderStill` 性能和首次准备慢

表现：

- 首次 bundle 慢。
- 项目内 Remotion 依赖缺失。
- Windows 上 Chromium / Remotion binaries 路径问题。

处理：

- 复用 `prepareRemotionForNativeSync()`。
- 使用项目内 `requireFromRemotion()`，不从根依赖加载 renderer。
- 错误信息明确区分：
  - 依赖缺失。
  - bundle 失败。
  - composition 不存在。
  - renderStill 失败。
- 第一版不做复杂队列，失败就让 Agent 说明未完成视觉确认。
- 抽 `remotion-native-render.js` 共享导出与渲帧准备逻辑，避免两套路径漂移。

## 5. 风险：Agent stream idle timeout 误杀长工具

表现：

- `renderFrame` bundle/renderStill 超过 30 秒。
- `verifyFrameAgainstGoal` 调多模态模型超过 30 秒。
- `streamAgentWithTimeouts()` 当前 `CHUNK_IDLE_TIMEOUT_MS` 是 30 秒，tool 执行期间没有 AI chunk。
- Agent 报 `E2810: LLM 流式响应中断`，但实际是工具还在跑。

处理：

- vision tools 启用时，在 `runAgentAttempt()` 调用 `streamAgentWithTimeouts()` 传入更长 `chunkIdleMs`，建议 120 秒。
- 或实现 tool progress heartbeat，但第一版更推荐放宽 vision 场景 idle。
- 测试 fake long-running tool，确认不会 30 秒误杀。

## 6. 风险：与导出/预览抢资源

表现：

- 导出中再渲帧，CPU/GPU/Chromium 竞争。
- 多轮 Agent 自检造成连续渲染。

处理：

- `frame-render-service` 全局 active lock。
- `export-service.getActiveExport()` 有值时拒绝。
- 每轮 Agent 最多 2 次 render。
- 后续如果需要队列，放到 M13 Heartbeat/任务编排，不在 M11 第一版做。

## 7. 风险：Remotion Code 未编译就渲帧

表现：

- Agent 刚写了自定义 TSX。
- 还没 `compileRemotionCheck`。
- `renderFrame` bundle 失败，视觉自检无法执行。

处理：

- system prompt 明确：写 Remotion 自定义源码后，先 `compileRemotionCheck`，再 `renderFrame`。
- `renderFrame` bundle 失败时只作为自检失败，不替代 M5.2 编译回滚。
- `runAgent()` 现有 compile rollback 仍是最终安全网。

## 8. 风险：视觉模型输出不稳定

表现：

- 输出非 JSON。
- 判断错误。
- `suggestedToolActions` 给出不可执行建议。

处理：

- `frame-inspector` prompt 强制只输出 JSON。
- 使用 `extractJsonFromText()` 解析。
- 解析失败返回：

```json
{
  "pass": null,
  "failed": true,
  "summary": "视觉复核失败，无法自动判断"
}
```

- `confidence < 0.6` 时不建议自动修正。
- `suggestedToolActions` 只作为提示，不自动执行。
- 修正仍必须由 Agent 显式调用已有工具。

## 9. 风险：Agent 说自检但没调用工具

表现：

- 模型看到 prompt 后直接回复“已检查”，但没有调用 `renderFrame`。

处理：

- system prompt 明确：未调用视觉工具不得声称看过画面。
- prompt regression 测试覆盖。
- `runAgent()` 现有“未调用工具不得虚假完成”逻辑可扩展：
  - 如果用户要求“看一下/确认画面/自检”而本轮没有 vision tool call，返回 `systemNotice`。
- 第二阶段可做 orchestrator 强制自检，但第一版先不扩大改动。

## 10. 风险：截图缓存泄露隐私

表现：

- 渲帧图片可能包含用户素材、业务数据。
- 绝对路径可能进入 conversation 持久记录。

处理：

- 缓存放子项目 `.easymotion/agent-frames/`，不进 `assets/`。
- 自动清理。
- conversation 只保存摘要，不长期保存绝对路径。
- 如 UI 要展示缩略图，通过受控 IPC 读取，不让 renderer 任意读文件。
- 不上传给用户配置的 LLM provider 以外服务。

## 11. 风险：打包态路径差异

表现：

- 开发态可渲帧，打包态找不到模板、entry、binaries。

处理：

- 复用 `utils/paths.js` 和 `remotion-project.js` 现有路径能力。
- 不硬编码开发路径。
- 涉及真实渲帧路径后跑 `pnpm build:win`。
- 手测安装包内：
  - 打开项目。
  - 创建标题。
  - Agent 自检渲帧。

## 12. 风险：过早做 `capturePreview`

表现：

- 卡在 iframe、缩放、窗口坐标、DOM 安全边界。
- 引入 renderer 直接文件访问或跨域访问风险。

当前处理：

- 已作为 Phase 6 增强实现第一版，但控制范围：
  - renderer 只上报预览区域 rect 和响应 seek，不接触文件系统。
  - 主进程负责 `BrowserWindow.capturePage(rect)`、落盘和路径校验。
  - 截图写入 `.easymotion/agent-frames/`，metadata 与 `renderFrame` 对齐。
  - `verifyFrameAgainstGoal` 可复核 `capturePreview` 返回的 `renderId`。
- 已知限制：
  - 依赖当前 Electron 预览窗口可见、iframe 已加载。
  - 受窗口布局、缩放、遮挡影响。
  - 失败时 Agent 应退回 `renderFrame` 或明确说明未完成实时预览截图确认。
- 后续如果需要更高精度，可另做 preview iframe 内部截图协议。

## 13. 风险：工具文件继续膨胀

表现：

- `tools/index.js` 已经很大，继续塞 vision tools 会增加维护成本。

处理：

- 新增 `tools/vision-feedback.js`。
- `graph.js` 合并工具数组。
- 不在 M11 前置大重构。
- M11 后可按读/写/素材/导出/视觉拆工具模块。

## 14. 已确认决策

已拍板并按此实现：

1. **第一版不做实时 preview iframe 截图，只做 Remotion 离屏渲帧。**
   - 结论：同意；后续 Phase 6 已补实时预览截图第一版。

2. **视觉复核允许额外调用一次多模态 LLM。**
   - 结论：同意，但仅视觉任务触发，每轮最多 2 次。

3. **自检失败不阻断修改。**
   - 结论：同意，但完成消息必须明确“未完成视觉确认”。

4. **缓存保留到项目关闭后。**
   - 结论：保留最近少量，方便调试；自动清理。
