const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { removeDirRecursive } = require("../src/main/services/file-service");
const aiRefService = require("../src/main/services/ai-ref-service");
const {
  layoutToToolHints,
  extractJsonFromText,
  resolvePosition,
} = require("../src/main/agent/layout-mapper");
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
        }
      ]
    }
  }`);

  assert(analysis?.layout?.elements?.length === 1, "parse vision json");

  const hints = layoutToToolHints(analysis, timeline);
  assert(hints.length === 1, "layout hints");
  assert(hints[0].createClip.source.content === "Hello", "hint content");
  assert(hints[0].createClip.style.fontSize === 96, "hint fontSize");

  const pos = resolvePosition({ x: "center", y: "top" }, 1920, 1080);
  assert(pos.x === 960, "center x");
  // bottom-left 坐标系：y 向上增大，"top" ≈ 画布高度 80%
  assert(pos.y === 864, "top y");

  const section = buildVisionContextSection({
    visualAnalysis: analysis,
    toolHints: hints,
  });
  assert(section.includes("createTrack"), "vision context section");

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
