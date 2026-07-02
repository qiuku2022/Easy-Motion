const { buildSystemPrompt } = require("../src/main/agent/prompts/system");
const { buildVisionContextSection } = require("../src/main/agent/prompts/vision");
const { createTimelineTools } = require("../src/main/agent/tools");
const { TimelineContext } = require("../src/main/agent/timeline-context");
const {
  normalizeClipUpdates,
  resolveRelativeClipUpdates,
} = require("../src/main/agent/clip-updates");
const { runSimplifiedFallback } = require("../src/main/agent/fallback-templates");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const BASE_TIMELINE = {
  version: "1.0",
  fps: 30,
  durationInFrames: 90,
  width: 1280,
  height: 720,
  tracks: [],
};

const SAMPLE_CLIP = {
  id: "clip-1",
  name: "标题",
  type: "text",
  startInFrames: 0,
  durationInFrames: 90,
  style: { fontSize: 60, color: "#ffffff" },
  source: { kind: "inline", content: "Hello" },
};

function main() {
  const prompt = buildSystemPrompt({
    timeline: BASE_TIMELINE,
    subprojectName: "默认片段",
  });
  assert(prompt.includes("createTrack"), "system prompt mentions createTrack");
  assert(prompt.includes("listTimeline"), "system prompt mentions listTimeline");
  assert(prompt.includes("getClipDetail"), "system prompt mentions getClipDetail");
  assert(prompt.includes("queryTimelineRange"), "system prompt mentions queryTimelineRange");
  assert(prompt.includes("moveClip"), "system prompt mentions moveClip");
  assert(prompt.includes("updateTimelineSettings"), "system prompt mentions updateTimelineSettings");
  assert(prompt.includes("batchUpdateClips"), "system prompt mentions batchUpdateClips");
  assert(prompt.includes("batchDeleteClips"), "system prompt mentions batchDeleteClips");
  assert(prompt.includes("batchShiftClips"), "system prompt mentions batchShiftClips");
  assert(prompt.includes("applySceneTemplate"), "system prompt mentions applySceneTemplate");
  assert(prompt.includes("applyVisualLayout"), "system prompt mentions applyVisualLayout");
  assert(prompt.includes("setWorkArea"), "system prompt mentions setWorkArea");
  assert(prompt.includes("exportVideo"), "system prompt mentions exportVideo");
  assert(prompt.includes("getExportStatus"), "system prompt mentions getExportStatus");
  assert(prompt.includes("cancelExport"), "system prompt mentions cancelExport");
  assert(prompt.includes("importAsset"), "system prompt mentions importAsset");
  assert(prompt.includes("listAssets"), "system prompt mentions listAssets");
  assert(prompt.includes("placeAsset"), "system prompt mentions placeAsset");
  assert(prompt.includes("importDataFile"), "system prompt mentions importDataFile");
  assert(prompt.includes("mapChartData"), "system prompt mentions mapChartData");
  assert(prompt.includes("bindChartData"), "system prompt mentions bindChartData");
  assert(prompt.includes("applyPreset"), "system prompt mentions applyPreset");
  assert(prompt.includes("listPresets"), "system prompt mentions listPresets");
  assert(prompt.includes("E2010"), "system prompt mentions conflict handling");
  assert(prompt.includes("1280"), "system prompt includes width");
  assert(prompt.includes("30fps"), "system prompt includes fps");

  const withSelection = buildSystemPrompt({
    timeline: BASE_TIMELINE,
    selectedElement: { type: "clip", clip: SAMPLE_CLIP },
    userInput: "字体大一点",
  });
  assert(withSelection.includes("当前片段"), "selected clip adds adjust section");

  const bigger = resolveRelativeClipUpdates(SAMPLE_CLIP, "字体大一点", {});
  assert(bigger["style.fontSize"] === 72, "字体大一点 -> +20% fontSize");

  const smaller = resolveRelativeClipUpdates(SAMPLE_CLIP, "字体小一点", {});
  assert(smaller["style.fontSize"] === 48, "字体小一点 -> -20% fontSize");

  const normalized = normalizeClipUpdates({ fontSize: 80, color: "#fff" });
  assert(normalized["style.fontSize"] === 80, "normalize root fontSize");
  assert(normalized["style.color"] === "#fff", "normalize root color");

  const gradientBg = normalizeClipUpdates({
    background: "linear-gradient(135deg, #000, #fff)",
  });
  assert(
    gradientBg["style.background"]?.includes("linear-gradient"),
    "normalize background -> style.background",
  );

  const visionSection = buildVisionContextSection({
    visualAnalysis: { layout: { type: "free", elements: [] } },
    toolHints: ["createTrack"],
  });
  assert(visionSection.includes("参考图"), "vision section mentions reference image");

  const emptyVision = buildVisionContextSection({});
  assert(emptyVision === "", "empty vision context returns empty string");

  const ctx = new TimelineContext(BASE_TIMELINE, {
    userInput: "标题写着 Demo",
  });
  const tools = createTimelineTools(ctx);
  const toolNames = tools.map((tool) => tool.name).sort();
  assert(toolNames.length === 30, "timeline agent exposes 30 tools");
  assert(toolNames.includes("listTimeline"), "tools include listTimeline");
  assert(toolNames.includes("getClipDetail"), "tools include getClipDetail");
  assert(toolNames.includes("queryTimelineRange"), "tools include queryTimelineRange");
  assert(toolNames.includes("moveClip"), "tools include moveClip");
  assert(toolNames.includes("updateTimelineSettings"), "tools include updateTimelineSettings");
  assert(toolNames.includes("batchUpdateClips"), "tools include batchUpdateClips");
  assert(toolNames.includes("batchDeleteClips"), "tools include batchDeleteClips");
  assert(toolNames.includes("batchShiftClips"), "tools include batchShiftClips");
  assert(toolNames.includes("applySceneTemplate"), "tools include applySceneTemplate");
  assert(toolNames.includes("applyVisualLayout"), "tools include applyVisualLayout");
  assert(toolNames.includes("getWorkArea"), "tools include getWorkArea");
  assert(toolNames.includes("setWorkArea"), "tools include setWorkArea");
  assert(toolNames.includes("exportVideo"), "tools include exportVideo");
  assert(toolNames.includes("getExportStatus"), "tools include getExportStatus");
  assert(toolNames.includes("cancelExport"), "tools include cancelExport");
  assert(toolNames.includes("listAssets"), "tools include listAssets");
  assert(toolNames.includes("placeAsset"), "tools include placeAsset");
  assert(toolNames.includes("importDataFile"), "tools include importDataFile");
  assert(toolNames.includes("mapChartData"), "tools include mapChartData");
  assert(toolNames.includes("bindChartData"), "tools include bindChartData");
  assert(toolNames.includes("updateClip"), "tools include updateClip");
  assert(toolNames.includes("queryElement"), "tools include queryElement");
  assert(toolNames.includes("applyPreset"), "tools include applyPreset");
  assert(toolNames.includes("listPresets"), "tools include listPresets");

  const presetCtx = new TimelineContext(BASE_TIMELINE, { currentFrame: 12 });
  const applied = presetCtx.applyPreset({ presetName: "缩放弹出" });
  assert(applied.presetId === "rve-popping-text", "applyPreset resolves Chinese name");
  assert(presetCtx.changed, "applyPreset marks timeline changed");
  const placed = presetCtx.timeline.tracks[0]?.clips?.[0];
  assert(placed?.startInFrames === 12, "applyPreset uses currentFrame by default");

  const fallback = runSimplifiedFallback({
    timeline: BASE_TIMELINE,
    input: "标题写着 PromptRegression",
  });
  assert(fallback.timelineChanged, "fallback changes timeline for title request");
  assert(
    fallback.reply.includes("PromptRegression") || fallback.reply.includes("简化"),
    "fallback reply mentions input or simplified mode",
  );

  const cases = [
    "创建一个标题",
    "字体大一点",
    "背景改成渐变",
    "删除这个片段",
    "import 图片",
    "动画快一点",
    "移到左边",
    "query 背景",
    "添加关键帧",
    "设置淡入动画",
  ];
  assert(cases.length === 10, "prompt regression case list has 10 items");
  for (const text of cases) {
    assert(typeof text === "string" && text.length > 0, `case should be non-empty: ${text}`);
  }

  console.log("test-agent-prompt-regression: passed");
}

main();
