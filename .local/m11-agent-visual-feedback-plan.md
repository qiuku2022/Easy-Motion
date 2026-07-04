# M11 Agent 视觉反馈闭环开发方案

> 状态：本地开发完成，待提交；暂不进入正式需求文档。
> 目标里程碑：M11 - Agent 视觉反馈闭环（让 AI「看得见」）。
> 组织方式：本文件是总入口，细节拆到 `m11-agent-visual-feedback/` 子文档。

## 1. 总结

M11 的核心目标不是让 Agent 操作屏幕，而是让它能基于结构化工具完成一次闭环：

```text
修改 timeline / Remotion 代码
  -> 渲染指定帧
  -> 多模态复核画面
  -> 发现偏差后有限修正
  -> 如实反馈是否完成视觉确认
```

已按三层完成：

1. **主进程离屏渲帧**：已实现 `renderFrame`，基于 Remotion `renderStill` 渲染指定帧到受控缓存目录。
2. **工具内部视觉复核**：已实现 `verifyFrameAgainstGoal`，由工具内部调用多模态模型分析图片并返回结构化 JSON。
3. **实时预览截图增强**：已实现 `seekPlayhead` / `capturePreview` 第一版，renderer 上报预览区域，主进程用 `BrowserWindow.capturePage(rect)` 截取可见预览画面。

关键判断：不要把截图 base64 直接塞进普通 LangChain tool 返回值。当前工具返回是 JSON 字符串，直接回传图片会浪费上下文，也不保证被模型按多模态内容理解。更稳的是让视觉复核工具内部调用多模态模型。

结合当前代码，M11 方案需要额外收紧三点：

- **渲染本轮内存 timeline**：Agent 工具执行期间，timeline 改动还没被 `agent-service` 保存到磁盘；`renderFrame` 不能像导出一样重新 `loadTimeline()`，必须接收 `TimelineContext` 当前内存态。
- **不要调用会落盘的 `syncPreviewManifest()`**：现有 `timelineService.syncPreviewManifest()` 会写回 `subproject.json`，M11 自检应使用临时 manifest / inputProps 渲染，并在 bundle 后恢复旧 manifest。
- **调整 Agent tool idle 超时**：现有 `streamAgentWithTimeouts` idle 是 30 秒，bundle/renderStill/视觉复核可能超过这个值；M11 需要提高 vision 工具场景的 `chunkIdleMs`，或加入 tool progress 心跳。

当前实现结论：

- `renderFrame` 渲染 `TimelineContext` 当前内存态，不提前保存 `subproject.json`。
- `verifyFrameAgainstGoal` 可复核 `renderFrame` 与 `capturePreview` 产生的截图。
- `capturePreview` 依赖 Electron 当前预览窗口可见；失败时 Agent 应退回 `renderFrame` 或如实说明未完成视觉确认。
- M11 本地验证已通过：`pnpm test:m11`、`pnpm test`、`pnpm lint`、`pnpm --filter @easymotion/electron build:renderer`。
- 发版前仍建议补跑：`pnpm build:win` 与安装包手测。

## 2. 子文档

- [00 背景与边界](m11-agent-visual-feedback/00-background-and-scope.md)
- [01 架构设计](m11-agent-visual-feedback/01-architecture.md)
- [02 实施步骤](m11-agent-visual-feedback/02-implementation-phases.md)
- [03 测试与验收](m11-agent-visual-feedback/03-testing-and-acceptance.md)
- [04 风险与决策](m11-agent-visual-feedback/04-risks-and-decisions.md)

## 3. 推荐交付顺序

1. **M11.1 渲帧服务骨架**
   - 新增 `frame-render-service.js`
   - 抽出导出/渲帧共享的 Remotion native render helper
   - 支持 fake renderer 测试
   - 新增 `test:m11` 初始脚本

2. **M11.2 Agent `renderFrame` 工具**
   - 新增 `tools/vision-feedback.js`
   - 在 `graph.js` 挂载 vision tools
   - 渲染 `TimelineContext` 内存中的本轮 timeline
   - 覆盖 schema、默认帧、限额、服务注入测试

3. **M11.3 视觉复核**
   - 新增 `frame-inspector.js`
   - 新增 `verifyFrameAgainstGoal`
   - 支持 fake vision model，无 API Key 可测

4. **M11.4 Prompt 与对话结果**
   - 更新 `prompts/system.js`
   - 透传 `visualChecks`
   - 补 `test-agent-prompt-regression.js`

5. **M11.5 手测与打包路径验证**
   - API Key 手测
   - Windows 路径验证
   - 涉及真实渲帧/打包路径时跑 `pnpm build:win`

6. **M11.6 实时预览截图增强**
   - 新增 `seekPlayhead` 与 `capturePreview` Agent tools
   - renderer `PreviewWindow` 上报 iframe 可见区域并响应 seek 请求
   - 主进程 `preview-capture-service` 负责截图、缓存与 metadata
   - `verifyFrameAgainstGoal` 支持复核实时预览截图

## 4. 第一版必须满足

- Agent 工具列表包含 `renderFrame`、`seekPlayhead`、`capturePreview` 与 `verifyFrameAgainstGoal`。
- 给定当前项目和 frame，`renderFrame` 能输出 PNG 到受控缓存目录。
- 给定可见实时预览，`capturePreview` 能输出 PNG 到受控缓存目录。
- 渲帧不与导出并发冲突，同一时刻只允许一个 frame render。
- 无 API Key 时，M11 测试可通过 fake model / fake renderer。
- 有 API Key 手测时，Agent 能在创建或修改标题后自检至少一个 frame。
- 视觉复核失败时如实说明，不能虚构“已看见画面”。
- 每轮最多 2 次渲帧，避免无限循环。
- 自检渲帧不提前污染 `subproject.json`，取消/失败后不会留下错误 timeline。
- `test:m11`、`test:m5`、`test:m5.2`、`pnpm test`、`pnpm lint` 通过。

## 5. 已确认决策

我的建议默认值：

- 第一版先做 Remotion 离屏渲帧；实时预览 iframe 截图已作为 Phase 6 增强补齐。
- 默认仅在明确视觉任务中自检，每轮最多 2 次。
- 缓存放在 `<project>/<subproject>/.easymotion/agent-frames/`。
- 缓存保留最近 50 张或 100MB。
- 自检失败不阻断修改，但必须明确告知“已修改但未完成视觉确认”。

已拍板的产品/成本决策：

- **接受**第一阶段优先走 Remotion 离屏渲帧；实时预览截图已在 Phase 6 补齐第一版。
- **允许**视觉复核额外调用一次多模态 LLM，但必须有限制：仅在明确视觉任务中触发，每轮最多 2 次。
- **补充完成**实时预览截图第一版：仅截取 Electron 当前可见预览区域，不让 renderer 接触文件系统。

技术实现默认按子文档收紧后的方案走：

- 渲染 `TimelineContext` 内存态。
- 使用临时 manifest，不提前写 `subproject.json`。
- 抽共享 Remotion native render helper。
- vision tools 场景放宽 Agent idle timeout。
