const { HumanMessage, AIMessage } = require("langchain");
const { TimelineContext } = require("./timeline-context");
const { createTimelineAgent } = require("./graph");
const { AgentState } = require("./state");
const { findClipLocation } = require("./timeline-ops");
const { resolveRelativeClipUpdates } = require("./clip-updates");
const { streamAgentWithTimeouts, isRetriableAgentError } = require("./stream-timeout");
const { runSimplifiedFallback } = require("./fallback-templates");
const { buildMultimodalHumanMessage } = require("./multimodal");
const { analyzeReferenceImages } = require("./vision-analyze");

function getMessageText(message) {
  if (!message?.content) return "";
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content)) {
    return message.content
      .map((block) => (typeof block === "string" ? block : block?.text || ""))
      .join("");
  }
  return String(message.content);
}

function isAiMessage(message) {
  const type = message?._getType?.() ?? message?.constructor?.name ?? "";
  return type === "ai" || type.startsWith("AIMessage");
}

function buildAgentMessages({
  history = [],
  input,
  imagePaths = [],
  projectPath,
}) {
  const messages = [];

  for (const item of history) {
    if (!item?.content?.trim()) continue;
    if (item.role === "assistant") {
      messages.push(new AIMessage(item.content));
    } else if (item.role === "user") {
      messages.push(new HumanMessage(item.content));
    }
  }

  const last = history[history.length - 1];
  const needsNewUserMessage = !last || last.role !== "user" || last.content !== input;

  if (needsNewUserMessage) {
    messages.push(
      buildMultimodalHumanMessage({
        text: input,
        imagePaths,
        projectPath,
      })
    );
  }

  return messages;
}

function applySelectedElementFallback(ctx, selectedElement, input) {
  if (
    !ctx.changed &&
    selectedElement?.type === "clip" &&
    selectedElement.id &&
    input
  ) {
    const located = findClipLocation(ctx.timeline.tracks, selectedElement.id);
    if (located) {
      const updates = resolveRelativeClipUpdates(located.clip, input, {});
      if (Object.keys(updates).length > 0) {
        ctx.updateClip({ clipId: selectedElement.id, updates });
      }
    }
  }
}

async function runAgentAttempt({
  timeline,
  subprojectName,
  projectPath,
  subprojectPath,
  input,
  history = [],
  selectedElement = null,
  confirmOverwrite = false,
  currentFrame = 0,
  imagePaths = [],
  onStatus,
  onChunk,
  signal,
}) {
  const ctx = new TimelineContext(timeline, {
    subprojectName,
    projectPath,
    subprojectPath,
    selectedElement,
    userInput: input,
    confirmOverwrite,
    currentFrame,
  });

  let visualAnalysis = null;
  let toolHints = [];
  let visionNotice = null;

  if (imagePaths.length && projectPath) {
    onStatus?.(AgentState.ANALYZING);
    const vision = await analyzeReferenceImages({
      projectPath,
      imagePaths,
      userText: input,
      timeline,
      signal,
    });
    visualAnalysis = vision.visualAnalysis;
    toolHints = vision.toolHints;
    if (vision.failed) {
      visionNotice = vision.notice;
    }
  }

  const { agent } = createTimelineAgent(ctx, { visualAnalysis, toolHints });
  const messages = buildAgentMessages({
    history,
    input,
    imagePaths,
    projectPath,
  });

  onStatus?.(AgentState.GENERATING);

  const streamed = await streamAgentWithTimeouts(agent, messages, {
    signal,
    onChunk,
    onStatus,
    isAiMessage,
    getMessageText,
  });

  onStatus?.(AgentState.COMPLETED);
  applySelectedElementFallback(ctx, selectedElement, input);

  return {
    reply: streamed,
    timeline: ctx.timeline,
    timelineChanged: ctx.changed,
    changeLog: ctx.changeLog,
    simplifiedMode: false,
    systemNotice: visionNotice,
  };
}

function looksLikeTimelineModification(input) {
  return /改|创建|添加|删除|隐藏|渐变|背景|轨道|字体|大一点|小一点|移到|换成|新建|调整|设为|改为|预设|图表|柱状|片头|标题动画|动效/.test(
    String(input ?? "")
  );
}

async function runAgent(options) {
  const maxAttempts = 2;
  let lastError = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await runAgentAttempt(options);
      if (result.timelineChanged || !looksLikeTimelineModification(options.input)) {
        return result;
      }
      if (attempt >= maxAttempts - 1) {
        return {
          ...result,
          systemNotice:
            "本次未实际修改时间线（模型未调用工具）。请用更具体的指令重试，例如「新建 shape 轨道并设置四色渐变背景」。",
        };
      }
      options.onStatus?.(AgentState.PARSING);
      options.input = `${options.input}\n\n【系统要求】你必须调用 createTrack / createClip / updateClip / applyPreset 等工具修改时间线 JSON，禁止仅用文字描述已完成。`;
      continue;
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      lastError = error;
      if (!isRetriableAgentError(error) || attempt >= maxAttempts - 1) {
        break;
      }
      options.onStatus?.(AgentState.PARSING);
    }
  }

  if (lastError && !isRetriableAgentError(lastError)) {
    throw lastError;
  }

  const fallback = runSimplifiedFallback({
    timeline: options.timeline,
    subprojectName: options.subprojectName,
    input: options.input,
  });

  options.onChunk?.(
    fallback.reply || "已切换至简化生成模式，已创建基础文字动画。"
  );

  return fallback;
}

module.exports = {
  runAgent,
  runAgentAttempt,
  buildAgentMessages,
  getMessageText,
  isRetriableAgentError,
};
