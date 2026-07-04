# 00 背景与边界

## 1. 当前基础

M11 不是从零开始。M10 后，EasyMotion 已具备：

- **Gateway**：`agent-service` + conversation IPC + 会话流式回传。
- **Brain**：LangChain `createAgent`，入口在 `apps/electron/src/main/agent/graph.js`。
- **Hands**：30 个 timeline 工具 + 4 个视觉反馈工具 + 9 个 Remotion Code 工具。
- **多模态参考图分析**：`vision-analyze.js` + `multimodal.js` 已能把用户上传的图片转换成多模态消息。
- **导出级 Remotion 渲染链路**：`export-service.js` 已通过项目内 Remotion 依赖调用 `@remotion/bundler` / `@remotion/renderer`。

关键文件：

- `apps/electron/src/main/agent/index.js`
- `apps/electron/src/main/agent/graph.js`
- `apps/electron/src/main/agent/tools/index.js`
- `apps/electron/src/main/agent/tools/remotion-code.js`
- `apps/electron/src/main/agent/vision-analyze.js`
- `apps/electron/src/main/agent/multimodal.js`
- `apps/electron/src/main/services/preview-service.js`
- `apps/electron/src/main/services/export-service.js`
- `apps/electron/src/main/services/remotion-project.js`

## 2. M11 目标

让 Agent 能对自己刚完成的视觉结果做一次有限自检：

```text
用户要求视觉结果
  -> Agent 调工具修改 timeline / Remotion 源码
  -> Agent 渲染指定帧
  -> Agent 让多模态模型检查画面是否符合目标
  -> 如有明确问题，最多修正一次
  -> 向用户说明是否完成视觉确认
```

这条路线是 OpenClaw 式“工具/API 驱动自主体”，不是 OpenCUA 式“截图点像素”。

## 3. 必做范围

- 新增主进程渲帧服务，能渲染当前子项目指定帧。
- 新增 Agent 工具：
  - `renderFrame`
  - `seekPlayhead`
  - `capturePreview`
  - `verifyFrameAgainstGoal`
  - `inspectFrame` 可作为后续增强，第一版可只留设计或骨架。
- 渲帧/截图结果保存到受控缓存目录。
- 视觉复核输出结构化 JSON，包括 `pass`、`confidence`、`issues`、`suggestedToolActions`。
- Agent prompt 明确：需要自检时要调用视觉工具，失败时不得编造。
- 测试脚本 `test:m11` 覆盖无 API Key 的 fake renderer / fake vision model。

## 4. 不做范围

- 不把实时 iframe 截图作为首要路径；已补 `capturePreview` 第一版，但主路径仍是 Remotion 离屏渲帧。
- 不做像素级 diff、OCR、复杂布局检测算法。
- 不做连续视频片段分析。
- 不做后台 Heartbeat 或长期任务队列。
- 不做无限自动纠错。

## 5. 硬性边界

- Agent 只在主进程运行，不能直接访问 renderer DOM 或 iframe。
- renderer 不允许 `require("fs")`，截图/渲帧落盘必须由主进程负责。
- Remotion 自定义源码仍走 M5.2 安全扫描、路径沙箱与编译检查。
- 预览仍以 timeline JSON 动态驱动为主，不回退到“每次改参都重新生成 TSX”。
- 导出中默认拒绝渲帧，避免 CPU/浏览器资源竞争。
- 每轮 Agent 最多 2 次渲帧、2 次视觉复核。
- Agent 自检必须渲染本轮 `TimelineContext` 内存态，不读取磁盘旧 timeline。
- Agent 自检路径不能调用会写 `subproject.json` 的 `timelineService.syncPreviewManifest()`。
- `capturePreview` 只截取 Electron 当前可见预览区域；renderer 只上报 rect 和响应 seek，不接触文件系统。
- vision tools 可能超过现有 30 秒 tool idle timeout，M11 必须同步调整超时策略。

## 6. 缓存目录

推荐：

```text
<project>/<subproject>/.easymotion/agent-frames/
```

理由：

- 跟随子项目，容易定位和清理。
- 不污染 `assets/`。
- 不进入用户素材库。
- 不作为导出工程的一部分。

清理策略：

- 最多保留最近 50 张。
- 或最多保留 100MB。
- 清理失败不阻塞本次渲帧。
