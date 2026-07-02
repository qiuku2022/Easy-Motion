const { buildRemotionCodePromptSection } = require("../src/main/agent/prompts/remotion-code");
const { TimelineContext } = require("../src/main/agent/timeline-context");
const { RemotionContext } = require("../src/main/agent/remotion-context");
const { createRemotionCodeTools } = require("../src/main/agent/tools/remotion-code");
const { createTimelineTools } = require("../src/main/agent/tools");

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

function main() {
  const timelineCtx = new TimelineContext(BASE_TIMELINE, {
    subprojectName: "默认片段",
    projectPath: "C:/tmp/Demo.em",
    subprojectPath: "subprojects/default",
  });
  const remotionCtx = new RemotionContext({
    projectPath: "C:/tmp/Demo.em",
    subprojectPath: "subprojects/default",
  });

  const timelineTools = createTimelineTools(timelineCtx);
  const remotionTools = createRemotionCodeTools(remotionCtx);
  assert(timelineTools.length >= 10, "timeline tools present");
  assert(remotionTools.length === 9, "remotion tools count");

  const remotionNames = remotionTools.map((t) => t.name).sort();
  assert(
    remotionNames.join(",") ===
      "compileRemotionCheck,getRemotionPackageInfo,listCustomComponents,listRemotionFiles,patchRemotionFile,readRemotionFile,registerCustomComponent,unregisterCustomComponent,writeRemotionFile",
    "remotion tool names"
  );

  const prompt = buildRemotionCodePromptSection({
    projectPath: "C:/tmp/Demo.em",
    subprojectPath: "subprojects/default",
  });
  assert(prompt.includes("Remotion 代码能力"), "system prompt includes remotion section");
  assert(prompt.includes("useCurrentFrame"), "system prompt includes remotion rules");
  assert(prompt.includes("listCustomComponents"), "system prompt includes custom lifecycle rules");

  console.log("test-remotion-graph: passed");
}

main();
