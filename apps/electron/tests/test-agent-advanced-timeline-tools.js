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
    durationInFrames: 120,
    width: 1280,
    height: 720,
    tracks: [
      {
        id: "track-text-a",
        name: "标题 A",
        type: "text",
        order: 0,
        visible: true,
        locked: false,
        muted: false,
        solo: false,
        clips: [
          {
            id: "clip-title",
            type: "text",
            name: "标题",
            startInFrames: 0,
            durationInFrames: 30,
            source: { kind: "inline", content: "Hello" },
            transform: { position: { x: 640, y: 360 }, scale: 1, rotation: 0, opacity: 1 },
            style: { fontSize: 72 },
            keyframes: [],
          },
          {
            id: "clip-blocker",
            type: "text",
            name: "阻挡片段",
            startInFrames: 60,
            durationInFrames: 30,
            source: { kind: "inline", content: "Blocker" },
            keyframes: [],
          },
        ],
      },
      {
        id: "track-text-b",
        name: "标题 B",
        type: "text",
        order: 1,
        visible: true,
        locked: false,
        muted: false,
        solo: false,
        clips: [],
      },
      {
        id: "track-image",
        name: "图片",
        type: "image",
        order: 2,
        visible: true,
        locked: false,
        muted: false,
        solo: false,
        clips: [],
      },
      {
        id: "track-shape",
        name: "背景",
        type: "shape",
        order: 3,
        visible: true,
        locked: false,
        muted: false,
        solo: false,
        clips: [
          {
            id: "clip-bg",
            type: "shape",
            name: "背景",
            startInFrames: 0,
            durationInFrames: 120,
            source: { kind: "inline", shape: "rect", width: 1280, height: 720 },
            transform: { position: { x: 640, y: 360 }, scale: 1, rotation: 0, opacity: 1 },
            style: {},
            keyframes: [],
          },
        ],
      },
    ],
  };
}

function findClip(timeline, clipId) {
  return timelineOps.findClipLocation(timeline.tracks, clipId)?.clip;
}

function main() {
  const ctx = new TimelineContext(buildTimeline());
  const tools = createTimelineTools(ctx);
  const toolNames = tools.map((tool) => tool.name);
  assert(toolNames.includes("moveClip"), "tools include moveClip");
  assert(toolNames.includes("updateTimelineSettings"), "tools include updateTimelineSettings");

  let result = timelineOps.moveClip(buildTimeline(), {
    clipId: "clip-title",
    startInFrames: 30,
  });
  assert(findClip(result.timeline, "clip-title").startInFrames === 30, "moveClip moves in same track");
  assert(findClip(result.timeline, "clip-title").lastModifiedBy === "ai", "moveClip marks ai modified");

  result = timelineOps.moveClip(buildTimeline(), {
    clipId: "clip-title",
    relativeOffsetInFrames: 15,
  });
  assert(findClip(result.timeline, "clip-title").startInFrames === 15, "moveClip supports relative offset");

  result = timelineOps.moveClip(buildTimeline(), {
    clipId: "clip-title",
    targetTrackId: "track-text-b",
    startInFrames: 45,
  });
  assert(
    timelineOps.findClipLocation(result.timeline.tracks, "clip-title").track.id === "track-text-b",
    "moveClip moves between tracks of same type",
  );

  let overlapThrown = false;
  try {
    timelineOps.moveClip(buildTimeline(), {
      clipId: "clip-title",
      startInFrames: 70,
    });
  } catch (error) {
    overlapThrown = error.message.includes("重叠");
  }
  assert(overlapThrown, "moveClip rejects overlap");

  let typeThrown = false;
  try {
    timelineOps.moveClip(buildTimeline(), {
      clipId: "clip-title",
      targetTrackId: "track-image",
      startInFrames: 30,
    });
  } catch (error) {
    typeThrown = error.message.includes("类型");
  }
  assert(typeThrown, "moveClip rejects mismatched track type");

  let overflowThrown = false;
  try {
    timelineOps.moveClip(buildTimeline(), {
      clipId: "clip-title",
      startInFrames: 100,
    });
  } catch (error) {
    overflowThrown = error.message.includes("超出时间线");
  }
  assert(overflowThrown, "moveClip rejects overflow without extendTimeline");

  result = timelineOps.moveClip(buildTimeline(), {
    clipId: "clip-title",
    startInFrames: 100,
    extendTimeline: true,
  });
  assert(result.timeline.durationInFrames === 130, "moveClip can extend timeline");
  assert(result.timelineExtended, "moveClip reports timeline extension");

  const conflictTimeline = buildTimeline();
  const conflictClip = findClip(conflictTimeline, "clip-title");
  conflictClip.lastModifiedBy = "user";
  conflictClip.lastModifiedAt = Date.now();
  let conflictThrown = false;
  try {
    timelineOps.moveClip(conflictTimeline, {
      clipId: "clip-title",
      startInFrames: 30,
    });
  } catch (error) {
    conflictThrown = error.message.includes("E2010");
  }
  assert(conflictThrown, "moveClip rejects recent user edits without confirmOverwrite");

  result = timelineOps.moveClip(conflictTimeline, {
    clipId: "clip-title",
    startInFrames: 30,
    confirmOverwrite: true,
  });
  assert(findClip(result.timeline, "clip-title").startInFrames === 30, "moveClip confirms overwrite");

  const settings = timelineOps.updateTimelineSettings(buildTimeline(), {
    width: 1080,
    height: 1920,
    fps: 60,
    durationInFrames: 150,
    scalePositions: true,
  });
  assert(settings.after.width === 1080, "updateTimelineSettings updates width");
  assert(settings.after.height === 1920, "updateTimelineSettings updates height");
  assert(settings.after.fps === 60, "updateTimelineSettings updates fps");
  assert(settings.after.durationInFrames === 150, "updateTimelineSettings updates duration");
  assert(settings.scaledPositions, "updateTimelineSettings reports scaled positions");
  assert(
    findClip(settings.timeline, "clip-bg").transform.position.x === 540,
    "updateTimelineSettings scales x position",
  );
  assert(
    findClip(settings.timeline, "clip-bg").source.height === 1920,
    "updateTimelineSettings scales shape height",
  );

  let truncateThrown = false;
  try {
    timelineOps.updateTimelineSettings(buildTimeline(), {
      durationInFrames: 60,
    });
  } catch (error) {
    truncateThrown = error.message.includes("截断");
  }
  assert(truncateThrown, "updateTimelineSettings rejects truncating clips");

  const fitted = timelineOps.updateTimelineSettings(buildTimeline(), {
    durationInFrames: 60,
    fitExistingClips: true,
  });
  assert(fitted.after.durationInFrames === 120, "updateTimelineSettings fits existing clips");
  assert(fitted.fittedDuration, "updateTimelineSettings reports fitted duration");

  const context = new TimelineContext(buildTimeline(), {
    selectedElement: { type: "clip", id: "clip-title" },
  });
  const moved = context.moveClip({ relativeOffsetInFrames: 10 });
  assert(moved.to.startInFrames === 10, "TimelineContext moveClip uses selected clip");
  assert(context.changed, "TimelineContext moveClip marks changed");
  assert(context.changeLog[0].op === "moveClip", "TimelineContext logs moveClip");

  context.updateTimelineSettings({ durationInFrames: 180 });
  assert(context.timeline.durationInFrames === 180, "TimelineContext updates settings");
  assert(
    context.changeLog.some((entry) => entry.op === "updateTimelineSettings"),
    "TimelineContext logs updateTimelineSettings",
  );

  console.log("test-agent-advanced-timeline-tools: passed");
}

main();
