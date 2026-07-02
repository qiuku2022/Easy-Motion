const { scanTsxSecurity, assertTsxSecurity } = require("../src/main/generator/security-scan");
const { TimelineContext } = require("../src/main/agent/timeline-context");
const { runSimplifiedFallback } = require("../src/main/agent/fallback-templates");
const { isRetriableAgentError } = require("../src/main/agent/stream-timeout");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const safe = `import React from "react";\nexport const X = () => <div>Hello</div>;`;
  assert(scanTsxSecurity(safe).valid, "safe code should pass");

  const evil = `eval("alert(1)")`;
  const bad = scanTsxSecurity(evil);
  assert(!bad.valid, "eval should fail");
  assert(bad.violations.includes("eval"), "eval violation id");

  let threw = false;
  try {
    assertTsxSecurity(`require('fs')`);
  } catch (error) {
    threw = error.message.includes("E2408");
  }
  assert(threw, "assertTsxSecurity throws E2408");

  const fallback = runSimplifiedFallback({
    timeline: {
      version: "1.0",
      fps: 30,
      durationInFrames: 90,
      width: 1280,
      height: 720,
      tracks: [],
    },
    input: "标题写着 Demo",
  });
  assert(fallback.timelineChanged, "fallback should change timeline");
  assert(fallback.simplifiedMode, "fallback marks simplified mode");
  assert(fallback.reply.includes("Demo") || fallback.reply.includes("简化"), "fallback reply");

  const ctx = new TimelineContext(
    {
      version: "1.0",
      fps: 30,
      durationInFrames: 90,
      width: 1280,
      height: 720,
      tracks: [],
    },
    {
      userInput:
        "创建全屏渐变背景，style.background 用 linear-gradient(135deg, #ff006e, #fb5607, #ffbe0b, #06d6a0)",
    }
  );
  const shapeTrack = ctx.createTrack({ name: "背景", type: "shape" });
  const shapeClip = ctx.createClip({
    trackId: shapeTrack.id,
    name: "渐变背景",
    startInFrames: 0,
    durationInFrames: 90,
    source: { kind: "inline", shape: "rect", width: 1280, height: 720 },
  });
  assert(
    shapeClip.style.background.includes("linear-gradient"),
    "shape clip should infer gradient background from user input"
  );

  assert(isRetriableAgentError(new Error("E2801: timeout")), "E2801 retriable");
  assert(!isRetriableAgentError(new Error("E2804: bad key")), "E2804 not retriable");

  console.log("phase5 resilience tests passed");
}

main();
