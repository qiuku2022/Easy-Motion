const fs = require("node:fs");
const path = require("node:path");
const { createChatModel } = require("./llm-factory");
const { buildMultimodalHumanMessage } = require("./multimodal");
const { extractJsonFromText } = require("./layout-mapper");
const frameRenderService = require("../services/frame-render-service");

const CHECK_TYPES = ["text", "color", "layout", "visibility", "style", "animation"];

function getMessageText(message) {
  if (typeof message?.content === "string") return message.content;
  if (Array.isArray(message?.content)) {
    return message.content
      .map((block) => (typeof block === "string" ? block : block?.text || ""))
      .join("");
  }
  return String(message?.content ?? "");
}

function isInsideAgentFrames(filePath) {
  const parts = path.resolve(filePath).split(path.sep);
  const index = parts.lastIndexOf(".easymotion");
  return index >= 0 && parts[index + 1] === "agent-frames";
}

function resolveFrameMetadata(input, service = frameRenderService) {
  if (!input?.renderId) {
    throw new Error("renderId is required");
  }
  const metadata = service.getFrameRender?.(input.renderId);
  if (!metadata) {
    throw new Error(`renderId not found: ${input.renderId}`);
  }
  const imagePath = metadata.image?.absolutePath;
  if (!imagePath) {
    throw new Error(`render metadata missing image path: ${input.renderId}`);
  }
  if (!isInsideAgentFrames(imagePath)) {
    throw new Error("render image path is outside agent-frames");
  }
  if (!fs.existsSync(imagePath)) {
    throw new Error(`render image not found: ${imagePath}`);
  }
  return metadata;
}

function normalizeChecks(checks = []) {
  const values = Array.isArray(checks) ? checks : [];
  const filtered = values.filter((item) => CHECK_TYPES.includes(item));
  return filtered.length ? [...new Set(filtered)] : ["visibility", "layout", "style"];
}

function buildFrameVerificationPrompt({ goal, checks, metadata, timeline }) {
  const timelineSummary = {
    fps: timeline?.fps ?? metadata.timelineSummary?.fps,
    durationInFrames:
      timeline?.durationInFrames ?? metadata.timelineSummary?.durationInFrames,
    width: timeline?.width ?? metadata.timelineSummary?.width,
    height: timeline?.height ?? metadata.timelineSummary?.height,
    tracks: Array.isArray(timeline?.tracks) ? timeline.tracks.length : undefined,
  };

  return [
    "你是 EasyMotion 的视觉复核器。请只根据截图判断画面是否符合目标。",
    "必须只输出 JSON，不要输出 Markdown、解释文字或代码块。",
    "",
    `用户目标: ${goal}`,
    `检查项: ${checks.join(", ")}`,
    `渲染帧: ${metadata.frame}`,
    `时间线摘要: ${JSON.stringify(timelineSummary)}`,
    "",
    "JSON schema:",
    JSON.stringify(
      {
        pass: "boolean|null",
        confidence: "number 0..1",
        summary: "string",
        issues: [
          {
            kind: "text|color|layout|visibility|style|animation|other",
            severity: "low|medium|high",
            target: "string",
            expected: "string",
            observed: "string",
          },
        ],
        suggestedToolActions: [
          {
            tool: "string",
            reason: "string",
            paramsHint: {},
          },
        ],
      },
      null,
      2
    ),
  ].join("\n");
}

function clampConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function normalizeIssue(issue = {}) {
  return {
    kind: String(issue.kind ?? "other"),
    severity: String(issue.severity ?? "medium"),
    target: String(issue.target ?? ""),
    expected: String(issue.expected ?? ""),
    observed: String(issue.observed ?? ""),
  };
}

function normalizeAction(action = {}) {
  return {
    tool: String(action.tool ?? ""),
    reason: String(action.reason ?? ""),
    paramsHint:
      action.paramsHint && typeof action.paramsHint === "object" ? action.paramsHint : {},
  };
}

function degradedResult(summary, extra = {}) {
  return {
    pass: null,
    confidence: 0,
    failed: true,
    summary,
    issues: [],
    suggestedToolActions: [],
    ...extra,
  };
}

function normalizeVerificationResult(parsed, metadata) {
  if (!parsed || typeof parsed !== "object") {
    return degradedResult("视觉复核失败，无法自动判断", {
      renderId: metadata.renderId,
      frame: metadata.frame,
    });
  }
  return {
    renderId: metadata.renderId,
    frame: metadata.frame,
    pass: typeof parsed.pass === "boolean" ? parsed.pass : null,
    confidence: clampConfidence(parsed.confidence),
    failed: false,
    summary: String(parsed.summary ?? ""),
    issues: Array.isArray(parsed.issues) ? parsed.issues.map(normalizeIssue) : [],
    suggestedToolActions: Array.isArray(parsed.suggestedToolActions)
      ? parsed.suggestedToolActions.map(normalizeAction)
      : [],
  };
}

async function verifyFrameAgainstGoal(input, options = {}) {
  const metadata = resolveFrameMetadata(
    input,
    options.frameRenderService ?? frameRenderService
  );
  const checks = normalizeChecks(input.checks);
  const prompt = buildFrameVerificationPrompt({
    goal: input.goal,
    checks,
    metadata,
    timeline: options.timeline,
  });
  const message = buildMultimodalHumanMessage({
    text: prompt,
    imagePaths: [metadata.image.absolutePath],
    projectPath: options.projectPath,
  });
  const model = options.model ?? createChatModel({ temperature: 0.1 });

  try {
    const response = await model.invoke([message], { signal: options.signal });
    const parsed = extractJsonFromText(getMessageText(response));
    return normalizeVerificationResult(parsed, metadata);
  } catch (error) {
    return degradedResult("视觉复核失败，无法自动判断", {
      renderId: metadata.renderId,
      frame: metadata.frame,
      error: error?.message || String(error),
    });
  }
}

async function inspectFrame(input, options = {}) {
  return verifyFrameAgainstGoal(
    {
      ...input,
      goal: input.goal ?? "描述当前画面的主要视觉内容和明显问题。",
      checks: input.checks ?? ["visibility", "layout", "style"],
    },
    options
  );
}

module.exports = {
  CHECK_TYPES,
  verifyFrameAgainstGoal,
  inspectFrame,
  resolveFrameMetadata,
  normalizeVerificationResult,
};
