const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { createProject, deleteProject } = require("../src/main/services/project-service");
const { renderFrame } = require("../src/main/services/frame-render-service");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function buildSimpleTimeline() {
  return {
    version: "1.0",
    fps: 30,
    durationInFrames: 90,
    width: 1280,
    height: 720,
    coordinateOrigin: "bottom-left",
    tracks: [
      {
        id: "track-bg",
        name: "黑色背景",
        type: "shape",
        order: 0,
        visible: true,
        locked: false,
        muted: false,
        solo: false,
        clips: [
          {
            id: "clip-bg",
            type: "shape",
            name: "黑色背景",
            startInFrames: 0,
            durationInFrames: 90,
            source: {
              kind: "inline",
              shape: "rect",
              width: 1280,
              height: 720,
            },
            transform: {
              position: { x: 640, y: 360 },
              scale: 1,
              rotation: 0,
              opacity: 1,
            },
            style: {
              fillColor: "#000000",
            },
            keyframes: [],
          },
        ],
      },
      {
        id: "track-title",
        name: "标题",
        type: "text",
        order: 1,
        visible: true,
        locked: false,
        muted: false,
        solo: false,
        clips: [
          {
            id: "clip-title",
            type: "text",
            name: "M11 标题",
            startInFrames: 0,
            durationInFrames: 90,
            source: {
              kind: "inline",
              content: "M11 Visual Check",
            },
            transform: {
              position: { x: 640, y: 360 },
              scale: 1,
              rotation: 0,
              opacity: 1,
            },
            style: {
              fontFamily: "Inter, sans-serif",
              fontSize: 72,
              color: "#ffffff",
              textAlign: "center",
            },
            keyframes: [],
          },
        ],
      },
    ],
  };
}

function listFrameBundleDirs(projectPath, subprojectPath) {
  const remotionCacheDir = path.join(
    projectPath,
    subprojectPath,
    "remotion",
    ".easymotion"
  );
  if (!fs.existsSync(remotionCacheDir)) return [];
  return fs
    .readdirSync(remotionCacheDir)
    .filter((name) => name.startsWith("frame-bundle-"));
}

async function removePathWithRetry(targetPath) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await fsp.rm(targetPath, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt >= 7 || error.code !== "EPERM") throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
}

async function main() {
  const parentPath = path.join(os.tmpdir(), `easymotion-m11-real-${Date.now()}`);
  const subprojectPath = "subprojects/default";
  fs.mkdirSync(parentPath, { recursive: true });
  let created = null;

  try {
    created = await createProject({
      name: "M11RealRender",
      parentPath,
      width: 1280,
      height: 720,
      fps: 30,
      durationInFrames: 90,
    });

    const subprojectJsonPath = path.join(
      created.path,
      subprojectPath,
      "subproject.json"
    );
    const beforeSubproject = fs.readFileSync(subprojectJsonPath, "utf8");
    const result = await renderFrame({
      projectPath: created.path,
      subprojectPath,
      timeline: buildSimpleTimeline(),
      frame: 0,
      scale: 0.5,
      reason: "M11 real render integration test",
    });
    const afterSubproject = fs.readFileSync(subprojectJsonPath, "utf8");

    assert(result.renderId, "renderId should be present");
    assert(result.frame === 0, "rendered frame should be 0");
    assert(result.image.mime === "image/png", "image mime should be png");
    assert(result.image.bytes > 0, "rendered image should be non-empty");
    assert(fs.existsSync(result.image.absolutePath), "rendered image file should exist");
    assert(result.image.sha256?.length === 64, "sha256 should be recorded");
    assert(
      result.image.relativePath.startsWith(".easymotion/agent-frames/"),
      "image path should stay inside agent-frames"
    );
    assert(beforeSubproject === afterSubproject, "subproject.json should not be touched");
    assert(
      listFrameBundleDirs(created.path, subprojectPath).length === 0,
      "temporary frame bundle directory should be removed"
    );

    console.log("test-frame-render-real: passed");
    console.log(`rendered: ${result.image.absolutePath}`);
  } finally {
    if (created?.path && fs.existsSync(created.path)) {
      await deleteProject(created.path).catch(() => {});
    }
    await removePathWithRetry(parentPath).catch((error) => {
      console.warn(
        `test-frame-render-real: cleanup skipped (${error.code || error.message}) ${parentPath}`
      );
    });
  }
}

main().catch((error) => {
  console.error("test-frame-render-real: FAIL", error);
  process.exit(1);
});
