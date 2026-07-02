const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { TimelineContext } = require("../src/main/agent/timeline-context");
const { createTimelineTools } = require("../src/main/agent/tools");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function buildTimeline() {
  return {
    version: "1.0",
    fps: 30,
    durationInFrames: 90,
    width: 1280,
    height: 720,
    tracks: [],
  };
}

function writeManifest(projectRoot, assets) {
  const manifestPath = path.join(projectRoot, "assets", "manifest.json");
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({ version: 1, assets }, null, 2),
    "utf8",
  );
}

function buildAsset(id) {
  return {
    id,
    name: `${id}.png`,
    originalName: `${id}.png`,
    type: "image",
    mimeType: "image/png",
    path: `assets/image/${id}.png`,
    publicPath: `/assets/image/${id}.png`,
    contentHash: id,
    sizeBytes: 10,
    width: 640,
    height: 360,
    durationInFrames: 90,
    isFavorite: false,
    usageCount: 0,
    importedAt: 1000,
    isDeleted: false,
  };
}

function findClip(timeline, predicate) {
  for (const track of timeline.tracks) {
    for (const clip of track.clips ?? []) {
      if (predicate(clip, track)) return { clip, track };
    }
  }
  return null;
}

function main() {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "em-agent-scene-"));
  writeManifest(projectRoot, [buildAsset("logo")]);

  const ctx = new TimelineContext(buildTimeline(), { projectPath: projectRoot });
  const toolNames = createTimelineTools(ctx).map((tool) => tool.name);
  assert(toolNames.includes("applySceneTemplate"), "tools include applySceneTemplate");

  const dryRun = ctx.applySceneTemplate({
    templateId: "product-intro",
    dryRun: true,
    parameters: {
      productName: "EasyMotion",
      tagline: "自然语言做动画",
    },
  });
  assert(dryRun.dryRun, "applySceneTemplate supports dryRun");
  assert(dryRun.operationCount > 0, "applySceneTemplate dryRun returns operations");
  assert(!ctx.changed, "applySceneTemplate dryRun does not mark changed");

  const product = ctx.applySceneTemplate({
    templateId: "product-intro",
    durationInFrames: 150,
    parameters: {
      productName: "EasyMotion",
      tagline: "自然语言做动画",
      logoAssetId: "logo",
      callToAction: "马上体验",
    },
  });
  assert(!product.dryRun, "product-intro executes");
  assert(product.createdTracks.length >= 4, "product-intro creates tracks");
  assert(product.createdClips.length >= 5, "product-intro creates clips");
  assert(ctx.timeline.durationInFrames >= 150, "product-intro fits timeline duration");
  const title = findClip(ctx.timeline, (clip) => clip.source?.content === "EasyMotion");
  assert(title?.track.type === "text", "product-intro creates title text");
  const assetClip = findClip(ctx.timeline, (clip) => clip.source?.assetId === "logo");
  assert(assetClip?.clip.source.publicPath === "/assets/image/logo.png", "product-intro resolves asset path");

  const missingData = ctx.applySceneTemplate({
    templateId: "data-report",
    parameters: { title: "收入汇报" },
  });
  assert(missingData.needsInput, "data-report returns required inputs without data");
  assert(missingData.requiredInputs.length > 0, "data-report reports required inputs");

  const dataCtx = new TimelineContext(buildTimeline());
  const report = dataCtx.applySceneTemplate({
    templateId: "data-report",
    durationInFrames: 180,
    parameters: {
      title: "收入汇报",
      subtitle: "Q1",
      chartType: "bar",
      chartData: [
        { label: "Jan", value: 120 },
        { label: "Feb", value: 180 },
      ],
      insightText: "收入增长明显",
    },
  });
  assert(report.createdClips.length >= 4, "data-report creates scene clips");
  const chart = findClip(dataCtx.timeline, (clip, track) => track.type === "chart");
  assert(chart?.clip.source.kind === "data", "data-report creates chart data clip");
  assert(chart.clip.source.data.length === 2, "data-report writes chart data");
  assert(chart.clip.source.chartType === "bar", "data-report writes chart type");

  const socialCtx = new TimelineContext(buildTimeline());
  const social = socialCtx.applySceneTemplate({
    templateId: "social-short",
    durationInFrames: 240,
    parameters: {
      hook: "3 秒看懂 EasyMotion",
      points: ["输入想法", "自动生成动画", "一键导出"],
      ending: "关注我们",
      aspectRatio: "9:16",
    },
  });
  assert(social.createdClips.length >= 6, "social-short creates hook, points and ending");
  assert(socialCtx.timeline.width === 1080, "social-short sets vertical width");
  assert(socialCtx.timeline.height === 1920, "social-short sets vertical height");
  const point = findClip(socialCtx.timeline, (clip) => clip.name === "要点 2");
  assert(point?.clip.source.content.includes("自动生成动画"), "social-short creates point text");

  let unknownThrown = false;
  try {
    socialCtx.applySceneTemplate({ templateId: "unknown", parameters: {} });
  } catch (error) {
    unknownThrown = error.message.includes("未知场景模板");
  }
  assert(unknownThrown, "applySceneTemplate rejects unknown template");

  fs.rmSync(projectRoot, { recursive: true, force: true });
  console.log("test-agent-scene-templates: passed");
}

main();
