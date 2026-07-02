const timelineOps = require("../src/main/agent/timeline-ops");
const { TimelineContext } = require("../src/main/agent/timeline-context");
const { createTimelineTools } = require("../src/main/agent/tools");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function buildTimeline() {
  return {
    version: "1.0",
    fps: 30,
    durationInFrames: 180,
    width: 1280,
    height: 720,
    tracks: [
      {
        id: "track-text",
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
            name: "主标题",
            startInFrames: 0,
            durationInFrames: 60,
            source: { kind: "inline", content: "Hello" },
            style: { fontSize: 72, color: "#ffffff" },
            keyframes: [
              {
                id: "kf-opacity",
                property: "transform.opacity",
                frame: 0,
                value: 0,
                easing: "linear",
                interpolation: "linear",
              },
            ],
          },
        ],
      },
      {
        id: "track-animation",
        name: "图表",
        type: "animation",
        order: 2,
        visible: true,
        locked: false,
        muted: false,
        solo: false,
        clips: [
          {
            id: "clip-chart",
            type: "animation",
            name: "折线图",
            startInFrames: 75,
            durationInFrames: 60,
            source: {
              kind: "component",
              component: "LineChart",
              props: { primaryColor: "#60a5fa" },
            },
            keyframes: [],
          },
        ],
      },
      {
        id: "track-group",
        name: "分组",
        type: "group",
        order: 3,
        visible: true,
        locked: false,
        muted: false,
        solo: false,
        clips: [],
        collapsed: false,
        children: [
          {
            id: "track-child-shape",
            name: "背景",
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
                name: "背景矩形",
                startInFrames: 0,
                durationInFrames: 180,
                source: { kind: "inline", shape: "rect", width: 1280, height: 720 },
                style: { fillColor: "#111827" },
                keyframes: [],
              },
            ],
          },
        ],
      },
    ],
  };
}

function main() {
  const timeline = buildTimeline();
  const ctx = new TimelineContext(timeline);
  const tools = createTimelineTools(ctx);
  const toolNames = tools.map((item) => item.name);

  assert(toolNames.includes("listTimeline"), "tools include listTimeline");
  assert(toolNames.includes("getClipDetail"), "tools include getClipDetail");
  assert(toolNames.includes("queryTimelineRange"), "tools include queryTimelineRange");

  const summary = ctx.listTimeline();
  assert(summary.timeline.width === 1280, "summary includes width");
  assert(summary.timeline.clipCount === 3, "summary counts clips including group children");
  assert(summary.tracks.length === 4, "summary flattens group children");
  assert(
    summary.tracks.find((track) => track.id === "track-child-shape")?.parentGroupId ===
      "track-group",
    "summary includes child track parentGroupId",
  );
  assert(
    summary.tracks[0].clips[0].sourceSummary.includes('text:"Hello"'),
    "summary includes text source summary",
  );
  assert(summary.tracks[0].clips[0].keyframeCount === 1, "summary includes keyframe count");
  assert(!summary.tracks[0].clips[0].style, "summary omits style by default");

  const detailedSummary = ctx.listTimeline({
    includeKeyframes: true,
    includeStyles: true,
  });
  assert(
    detailedSummary.tracks[0].clips[0].keyframes.length === 1,
    "includeKeyframes returns keyframes",
  );
  assert(
    detailedSummary.tracks[0].clips[0].style.fontSize === 72,
    "includeStyles returns style",
  );

  const detail = ctx.getClipDetail({ clipId: "clip-chart" });
  assert(detail.clip.source.component === "LineChart", "getClipDetail returns full clip");
  assert(detail.track.id === "track-animation", "getClipDetail returns track shell");

  let missingThrown = false;
  try {
    ctx.getClipDetail({ clipId: "missing" });
  } catch (error) {
    missingThrown = error.message.includes("片段不存在");
  }
  assert(missingThrown, "getClipDetail rejects missing clip");

  const partial = ctx.queryTimelineRange({
    startInFrames: 50,
    endInFrames: 90,
  });
  assert(partial.count === 3, "range query includes partial overlaps by default");

  const contained = ctx.queryTimelineRange({
    startInFrames: 50,
    endInFrames: 90,
    includePartialOverlap: false,
  });
  assert(contained.count === 0, "range query can require full containment");

  const animationOnly = ctx.queryTimelineRange({
    startInFrames: 0,
    endInFrames: 180,
    type: "animation",
  });
  assert(animationOnly.count === 1, "range query filters by type");
  assert(animationOnly.matches[0].clipId === "clip-chart", "range query returns clip id");

  const childTrackOnly = timelineOps.queryTimelineRange(timeline, {
    startInFrames: 0,
    endInFrames: 180,
    trackId: "track-child-shape",
  });
  assert(childTrackOnly.count === 1, "range query filters child track by id");

  let invalidRangeThrown = false;
  try {
    ctx.queryTimelineRange({ startInFrames: 10, endInFrames: 10 });
  } catch (error) {
    invalidRangeThrown = error.message.includes("时间范围无效");
  }
  assert(invalidRangeThrown, "queryTimelineRange rejects invalid ranges");

  console.log("test-agent-read-tools: passed");
}

main();
