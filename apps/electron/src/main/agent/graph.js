const { createAgent } = require("langchain");
const { createChatModel } = require("./llm-factory");
const { buildSystemPrompt } = require("./prompts/system");
const { buildVisionContextSection } = require("./prompts/vision");
const { buildRemotionCodePromptSection } = require("./prompts/remotion-code");
const { createTimelineTools } = require("./tools");
const { createRemotionCodeTools } = require("./tools/remotion-code");
const { createVisionFeedbackTools } = require("./tools/vision-feedback");
const { VisionFeedbackContext } = require("./vision-feedback-context");
const { resolveCreationMode, includesRemotionTools } = require("./router");

function createAgentGraph(timelineCtx, remotionCtx, visionContext = {}, options = {}) {
  const model = createChatModel();
  const effectiveMode = resolveCreationMode(
    options.creationMode ?? "free",
    timelineCtx.meta.userInput
  );

  const timelineTools = createTimelineTools(timelineCtx);
  const remotionTools = includesRemotionTools(effectiveMode)
    ? createRemotionCodeTools(remotionCtx, timelineCtx)
    : [];
  const visionCtx = new VisionFeedbackContext({
    timelineCtx,
    projectPath: timelineCtx.meta.projectPath,
    subprojectPath: timelineCtx.meta.subprojectPath,
    currentFrame: timelineCtx.meta.currentFrame ?? 0,
    frameRenderService: options.frameRenderService,
    previewCaptureService: options.previewCaptureService,
    frameInspector: options.frameInspector,
  });
  const visionTools = createVisionFeedbackTools(visionCtx);
  const tools = [...timelineTools, ...remotionTools, ...visionTools];

  let systemPrompt = buildSystemPrompt({
    timeline: timelineCtx.timeline,
    subprojectName: timelineCtx.meta.subprojectName,
    selectedElement: timelineCtx.meta.selectedElement,
    userInput: timelineCtx.meta.userInput,
    currentFrame: timelineCtx.meta.currentFrame ?? 0,
  });

  if (includesRemotionTools(effectiveMode)) {
    systemPrompt += buildRemotionCodePromptSection({
      projectPath: remotionCtx.meta.projectPath,
      subprojectPath: remotionCtx.meta.subprojectPath,
    });
  } else {
    systemPrompt +=
      "\n\n## 创作模式\n当前为**快速编辑**模式：仅使用时间线工具（createTrack / updateClip / applyPreset 等），不要读写 Remotion 源码。";
  }

  systemPrompt += buildVisionContextSection({
    visualAnalysis: visionContext.visualAnalysis,
    toolHints: visionContext.toolHints,
    layoutPlan: visionContext.layoutPlan,
  });

  const agent = createAgent({
    model,
    tools,
    systemPrompt,
  });

  return { agent, systemPrompt, effectiveMode, visionCtx };
}

function createHybridAgent(timelineCtx, remotionCtx, visionContext = {}, options = {}) {
  return createAgentGraph(timelineCtx, remotionCtx, visionContext, {
    ...options,
    creationMode: options.creationMode ?? "free",
  });
}

/** @deprecated 使用 createHybridAgent；保留别名便于测试 */
function createTimelineAgent(timelineCtx, visionContext = {}) {
  const { RemotionContext } = require("./remotion-context");
  const remotionCtx = new RemotionContext({
    projectPath: timelineCtx.meta.projectPath,
    subprojectPath: timelineCtx.meta.subprojectPath,
  });
  return createHybridAgent(timelineCtx, remotionCtx, visionContext);
}

module.exports = { createHybridAgent, createAgentGraph, createTimelineAgent };
