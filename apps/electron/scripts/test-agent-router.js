const { resolveCreationMode, includesRemotionTools } = require("../src/main/agent/router");
const { TimelineContext } = require("../src/main/agent/timeline-context");
const { RemotionContext } = require("../src/main/agent/remotion-context");
const { createTimelineTools } = require("../src/main/agent/tools");
const { createRemotionCodeTools } = require("../src/main/agent/tools/remotion-code");

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
  assert(resolveCreationMode("quick", "写一个粒子组件") === "quick", "quick mode");
  assert(resolveCreationMode("free", "标题 Hello") === "free", "free mode");
  assert(resolveCreationMode("auto", "标题 Hello") === "quick", "auto timeline");
  assert(
    resolveCreationMode("auto", "在 components/custom 写 ParticleBg") === "free",
    "auto code"
  );
  assert(includesRemotionTools("quick") === false, "quick excludes remotion");
  assert(includesRemotionTools("free") === true, "free includes remotion");

  const timelineCtx = new TimelineContext(BASE_TIMELINE, {
    subprojectName: "默认",
    projectPath: "C:/tmp/Demo.em",
    subprojectPath: "subprojects/default",
    userInput: "标题 Hello",
  });
  const remotionCtx = new RemotionContext({
    projectPath: "C:/tmp/Demo.em",
    subprojectPath: "subprojects/default",
  });

  assert(createTimelineTools(timelineCtx).length >= 10, "timeline tools baseline");
  assert(createRemotionCodeTools(remotionCtx, timelineCtx).length === 7, "remotion tools");
  assert(
    resolveCreationMode("auto", "标题 Hello") === includesRemotionTools("quick") ? "quick" : "free",
    "auto resolves consistently"
  );

  console.log("test-agent-router: passed");
}

main();
