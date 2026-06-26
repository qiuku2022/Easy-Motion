const { HumanMessage, AIMessage } = require("langchain");
const { TimelineContext } = require("./timeline-context");
const { RemotionContext, formatRemotionChangeSummary } = require("./remotion-context");
const { createHybridAgent } = require("./graph");
const { AgentState } = require("./state");
const { findClipLocation } = require("./timeline-ops");
const { resolveRelativeClipUpdates, resolvePresetClipUpdates, findPresetClipForInput } = require("./clip-updates");
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
      const presetUpdates = resolvePresetClipUpdates(located.clip, input);
      if (Object.keys(presetUpdates).length > 0) {
        ctx.updateClip({ clipId: selectedElement.id, updates: presetUpdates });
        return;
      }

      const updates = resolveRelativeClipUpdates(located.clip, input, {});
      if (Object.keys(updates).length > 0) {
        ctx.updateClip({ clipId: selectedElement.id, updates });
      }
    }
  }
}

function applyPresetClipFallback(ctx, selectedElement, input) {
  if (ctx.changed || !input) return;

  const clip = findPresetClipForInput(ctx.timeline, input);
  if (!clip || (selectedElement?.id && clip.id === selectedElement.id)) return;

  const updates = resolvePresetClipUpdates(clip, input);
  if (Object.keys(updates).length > 0) {
    ctx.updateClip({ clipId: clip.id, updates });
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
  creationMode = "free",
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

  const remotionCtx = new RemotionContext({
    projectPath,
    subprojectPath,
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

  const { agent } = createHybridAgent(ctx, remotionCtx, { visualAnalysis, toolHints }, {
    creationMode,
  });
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
  applyPresetClipFallback(ctx, selectedElement, input);

  return {
    reply: streamed,
    timeline: ctx.timeline,
    timelineChanged: ctx.changed,
    changeLog: ctx.changeLog,
    remotionChanged: remotionCtx.changed,
    remotionChangeLog: remotionCtx.changeLog,
    remotionCtx,
    simplifiedMode: false,
    systemNotice: visionNotice,
  };
}

function formatCompileErrors(compileResult) {
  if (Array.isArray(compileResult?.errors) && compileResult.errors.length) {
    return compileResult.errors.slice(0, 8).join("\n");
  }
  return String(compileResult?.output ?? compileResult?.message ?? "编译失败").slice(0, 2000);
}

async function ensureRemotionCompileOrRollback(remotionCtx) {
  if (!remotionCtx?.changed) return { ok: true };

  const compileResult = await remotionCtx.runCompileCheck();
  if (compileResult.skipped) return { ok: true, skipped: true };
  if (compileResult.success) return { ok: true };

  remotionCtx.rollbackAll();
  remotionCtx.changed = false;
  remotionCtx.changeLog = [];
  return { ok: false, errors: formatCompileErrors(compileResult) };
}

function looksLikeRemotionCodeModification(input) {
  return /组件|tsx|remotion|interpolate|spring|粒子|custom\/|useCurrentFrame|AbsoluteFill|writeRemotion|patchRemotion|源码/.test(
    String(input ?? "")
  );
}

function looksLikeTimelineModification(input) {
  return /改|创建|添加|删除|隐藏|渐变|背景|轨道|字体|大一点|小一点|移到|换成|换为|新建|调整|设为|改为|改成|预设|图表|柱状|折线|饼图|片头|标题动画|动效|颜色|配色|色调|色系|浅色|深色|折线|数据点|圆点/.test(
    String(input ?? "")
  );
}

function buildRetryPrompt(input, attempt) {
  const base =
    "【系统要求】你必须调用 timeline 工具（queryElement / updateClip / applyPreset 等）或 Remotion 工具（writeRemotionFile / registerCustomComponent）完成修改，禁止仅用文字描述已完成。";

  if (/折线|饼图|环形图|面积图|图表|Chart|primaryColor|secondaryColor/i.test(input)) {
    return `${input}\n\n${base}\n修改图表/预设配色：先 queryElement 定位 animation 片段，再 updateClip 设置 source.props.primaryColor（折线）与 source.props.secondaryColor（数据点），例如浅色可用 #93c5fd 与 #fde68a。`;
  }

  if (attempt >= 1) {
    return `${input}\n\n${base}\n示例：折线图改浅色 → updateClip 设置 source.props.primaryColor="#93c5fd" 与 source.props.secondaryColor="#fde68a"。`;
  }

  return `${input}\n\n${base}`;
}

async function runAgent(options) {
  const maxAttempts = 2;
  let lastError = null;
  let compileRetryUsed = false;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await runAgentAttempt(options);

      if (result.remotionCtx?.changed) {
        const compile = await ensureRemotionCompileOrRollback(result.remotionCtx);
        if (!compile.ok) {
          result.remotionChanged = false;
          result.remotionChangeLog = [];
          if (!compileRetryUsed) {
            compileRetryUsed = true;
            options.onStatus?.(AgentState.PARSING);
            options.input = `${options.input}\n\n【编译失败，写入已回滚】\n${compile.errors}\n请修正 TSX 后重新调用 writeRemotionFile / patchRemotionFile / registerCustomComponent，并再次 compileRemotionCheck。`;
            continue;
          }
          return {
            ...result,
            remotionCtx: undefined,
            systemNotice: `Remotion 代码编译失败，已回滚：\n${compile.errors}`,
          };
        }
        result.remotionChanged = result.remotionCtx.changed;
        result.remotionChangeLog = result.remotionCtx.changeLog;
      }

      delete result.remotionCtx;

      const modified =
        result.timelineChanged ||
        result.remotionChanged ||
        (!looksLikeTimelineModification(options.input) &&
          !looksLikeRemotionCodeModification(options.input));
      if (modified) {
        return result;
      }
      if (attempt >= maxAttempts - 1) {
        return {
          ...result,
          systemNotice:
            "本次未实际修改时间线或 Remotion 代码（模型未调用工具）。请用更具体的指令重试，例如「把折线图折线改成 #93c5fd、数据点改成 #fde68a」或「在 components/custom 创建 RedBg 组件」。",
        };
      }
      options.onStatus?.(AgentState.PARSING);
      options.input = buildRetryPrompt(options.input, attempt);
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
