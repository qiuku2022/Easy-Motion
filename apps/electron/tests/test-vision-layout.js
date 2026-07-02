const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { removeDirRecursive } = require("../src/main/services/file-service");
const aiRefService = require("../src/main/services/ai-ref-service");
const {
  layoutToToolHints,
  layoutToPlan,
  extractJsonFromText,
  resolvePosition,
  resolveSize,
} = require("../src/main/agent/layout-mapper");
const { TimelineContext } = require("../src/main/agent/timeline-context");
const { buildVisionContextSection } = require("../src/main/agent/prompts/vision");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function withTempProject(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "em-vision-"));
  fs.mkdirSync(path.join(root, "subprojects", "default"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "project.json"),
    JSON.stringify({
      version: "1.0",
      name: "test",
      subprojects: [{ id: "sub-default", path: "subprojects/default" }],
    }),
    "utf8"
  );
  try {
    await run(root);
  } finally {
    removeDirRecursive(root);
  }
}

function main() {
  const timeline = {
    width: 1920,
    height: 1080,
    durationInFrames: 90,
    fps: 30,
    tracks: [],
  };

  const analysis = extractJsonFromText(`{
    "layout": {
      "type": "free",
      "elements": [
        {
          "type": "text",
          "position": { "x": "center", "y": "top" },
          "style": { "fontSize": "96", "color": "#ffffff" },
          "content": "Hello",
          "zIndex": 0
        },
        {
          "type": "shape",
          "position": { "x": "50%", "y": "20%" },
          "size": { "width": "100%", "height": "40%" },
          "style": { "backgroundColor": "#111827" },
          "content": "背景",
          "zIndex": -1
        },
        {
          "type": "chart",
          "position": { "x": "center", "y": "center" },
          "size": { "width": "60%", "height": "35%" },
          "style": { "color": "#22c55e" },
          "content": "趋势图",
          "zIndex": 1
        },
        {
          "type": "image",
          "position": { "x": "right", "y": "bottom" },
          "size": { "width": "25%", "height": "20%" },
          "content": "产品图",
          "zIndex": 2
        }
      ]
    }
  }`);

  assert(analysis?.layout?.elements?.length === 4, "parse vision json");

  const hints = layoutToToolHints(analysis, timeline);
  assert(hints.length === 4, "layout hints");
  const textHint = hints.find((hint) => hint.createClip.source?.content === "Hello");
  assert(textHint, "hint content");
  assert(textHint.createClip.style.fontSize === 96, "hint fontSize");

  const pos = resolvePosition({ x: "center", y: "top" }, 1920, 1080);
  assert(pos.x === 960, "center x");
  // bottom-left 坐标系：y 向上增大，"top" ≈ 画布高度 80%
  assert(pos.y === 864, "top y");
  const size = resolveSize({ width: "50%", height: 0.25 }, timeline, "shape");
  assert(size.width === 960, "percent width");
  assert(size.height === 270, "decimal height");

  const layoutPlan = layoutToPlan(analysis, timeline);
  assert(layoutPlan.operations.length === 8, "layout plan creates track+clip per element");
  assert(
    layoutPlan.operations.some((op) => op.op === "createClip" && op.args.source?.shape === "rect"),
    "layout plan maps shape to shape clip",
  );
  assert(
    layoutPlan.operations.some((op) => op.op === "createClip" && op.args.source?.kind === "data"),
    "layout plan maps chart to data clip",
  );
  assert(
    layoutPlan.operations.some((op) => op.op === "createTrack" && op.args.name === "图片占位"),
    "layout plan maps image to visible placeholder",
  );

  const ctx = new TimelineContext(timeline, { layoutPlan });
  const dryRun = ctx.applyVisualLayout({ dryRun: true });
  assert(dryRun.operationCount === 8, "applyVisualLayout dryRun returns plan");
  assert(!ctx.changed, "applyVisualLayout dryRun does not mutate");
  const applied = ctx.applyVisualLayout();
  assert(applied.createdClips.length === 4, "applyVisualLayout creates clips");
  assert(ctx.changed, "applyVisualLayout marks changed");
  assert(ctx.timeline.tracks.length === 4, "applyVisualLayout creates tracks");
  assert(
    ctx.timeline.tracks.some((track) => track.type === "chart" && track.clips[0]?.source?.data?.length),
    "applyVisualLayout creates chart track",
  );

  const section = buildVisionContextSection({
    visualAnalysis: analysis,
    toolHints: hints,
    layoutPlan,
  });
  assert(section.includes("applyVisualLayout"), "vision context section mentions layout tool");

  void withTempProject(async (root) => {
    const src = path.join(root, "ref.png");
    fs.writeFileSync(src, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const { images } = await aiRefService.importAiRefFiles(root, [src]);
    assert(images.length === 1, "import ai ref");
    assert(images[0].relativePath.startsWith("assets/ai-refs/"), "ai-refs path");
    const dataUrl = aiRefService.readAiRefAsDataUrl(root, images[0].relativePath);
    assert(dataUrl.startsWith("data:image/png"), "preview data url");
  }).then(() => {
    console.log("vision-layout tests passed");
  });
}

main();
