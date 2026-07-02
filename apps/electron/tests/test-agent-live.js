const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { loadEnv } = require("../src/main/utils/load-env");
const { resolveLlmConfig } = require("../src/main/services/llm-service");
const { createProject } = require("../src/main/services/project-service");
const { runAgent } = require("../src/main/agent");
const timelineService = require("../src/main/services/timeline-service");

async function main() {
  loadEnv();
  const config = resolveLlmConfig();
  if (!config.apiKey) {
    console.log("test-agent-live: skip (no API key)");
    return;
  }

  const parentPath = path.join(os.tmpdir(), `em-agent-live-${Date.now()}`);
  fs.mkdirSync(parentPath, { recursive: true });

  const created = await createProject({
    name: "AgentLiveTest",
    parentPath,
  });

  const projectPath = created.path;
  const subprojectPath = "subprojects/default";
  const timelineBefore = timelineService.loadTimeline(projectPath, subprojectPath);
  const trackCountBefore = timelineBefore.tracks.length;

  console.log("test-agent-live: tracks before =", trackCountBefore);

  const chunks = [];
  const result = await runAgent({
    projectPath,
    subprojectPath,
    subprojectName: "默认片段",
    timeline: timelineBefore,
    input:
      "把背景改成四色渐变。新建 shape 轨道在最底层，全屏矩形，style.background 用 linear-gradient(135deg, #ff006e, #fb5607, #ffbe0b, #06d6a0)",
    history: [],
    onChunk: (c) => chunks.push(c),
    onStatus: (s) => console.log("  status:", s),
  });

  console.log("test-agent-live: timelineChanged =", result.timelineChanged);
  console.log("test-agent-live: changeLog =", JSON.stringify(result.changeLog, null, 2));
  console.log("test-agent-live: reply preview =", result.reply?.slice(0, 200));

  const trackCountAfter = result.timeline.tracks.length;
  console.log("test-agent-live: tracks after =", trackCountAfter);

  if (!result.timelineChanged) {
    throw new Error("Agent did not change timeline for gradient request");
  }

  const hasShapeTrack = result.timeline.tracks.some((track) => track.type === "shape");
  if (!hasShapeTrack) {
    throw new Error("No shape track found after gradient request");
  }

  const shapeClip = result.timeline.tracks
    .flatMap((t) => t.clips ?? [])
    .find((c) => c.style?.background?.includes("linear-gradient"));
  if (!shapeClip) {
    throw new Error("No shape clip with linear-gradient background");
  }

  fs.rmSync(parentPath, { recursive: true, force: true });
  console.log("test-agent-live: PASS");
}

main().catch((error) => {
  console.error("test-agent-live: FAIL", error);
  process.exit(1);
});
