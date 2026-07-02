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
        name: "标题文字",
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
            name: "主标题",
            startInFrames: 0,
            durationInFrames: 30,
            source: { kind: "inline", content: "EasyMotion" },
            style: { color: "#ffffff", fontSize: 72 },
            keyframes: [],
          },
          {
            id: "clip-subtitle",
            type: "text",
            name: "副标题",
            startInFrames: 30,
            durationInFrames: 30,
            source: { kind: "inline", content: "自然语言做动画" },
            style: { color: "#ffffff", fontSize: 42 },
            keyframes: [],
          },
          {
            id: "clip-ending",
            type: "text",
            name: "结尾 CTA",
            startInFrames: 90,
            durationInFrames: 20,
            source: { kind: "inline", content: "立即开始" },
            style: { color: "#ffffff", fontSize: 48 },
            keyframes: [],
          },
        ],
      },
      {
        id: "track-animation",
        name: "图表预设",
        type: "animation",
        order: 1,
        visible: true,
        locked: false,
        muted: false,
        solo: false,
        clips: [
          {
            id: "clip-chart",
            type: "animation",
            name: "折线图",
            startInFrames: 0,
            durationInFrames: 90,
            source: {
              kind: "component",
              component: "RveLineChart",
              presetId: "rve-line-chart",
              props: { primaryColor: "#60a5fa" },
            },
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
  const toolNames = createTimelineTools(ctx).map((tool) => tool.name);
  assert(toolNames.includes("batchUpdateClips"), "tools include batchUpdateClips");
  assert(toolNames.includes("batchDeleteClips"), "tools include batchDeleteClips");
  assert(toolNames.includes("batchShiftClips"), "tools include batchShiftClips");

  let dryRun = ctx.batchUpdateClips({
    selector: { type: "text" },
    updates: { "style.color": "#2563eb" },
    dryRun: true,
  });
  assert(dryRun.matchedCount === 3, "batchUpdateClips matches by type");
  assert(dryRun.updatedCount === 0, "batchUpdateClips dryRun does not update");
  assert(!ctx.changed, "batchUpdateClips dryRun does not mark changed");
  assert(findClip(ctx.timeline, "clip-title").style.color === "#ffffff", "dryRun keeps timeline");

  const textMatch = ctx.batchUpdateClips({
    selector: { textIncludes: "自然语言" },
    updates: { "style.color": "#f97316" },
  });
  assert(textMatch.updatedCount === 1, "batchUpdateClips matches textIncludes");
  assert(
    findClip(ctx.timeline, "clip-subtitle").style.color === "#f97316",
    "batchUpdateClips applies updates",
  );

  const componentMatch = ctx.batchUpdateClips({
    selector: { sourceComponent: "LineChart" },
    updates: { "source.props.primaryColor": "#22c55e" },
  });
  assert(componentMatch.updatedCount === 1, "batchUpdateClips matches sourceComponent");
  assert(
    findClip(ctx.timeline, "clip-chart").source.props.primaryColor === "#22c55e",
    "batchUpdateClips updates preset props",
  );

  const limited = ctx.batchUpdateClips({
    selector: { type: "text" },
    updates: { "style.fontSize": 50 },
    maxMatches: 1,
  });
  assert(limited.requiresConfirmation, "batchUpdateClips requires confirmation over maxMatches");
  assert(limited.matchedCount === 3, "batchUpdateClips reports over-limit matches");

  const conflictTimeline = buildTimeline();
  findClip(conflictTimeline, "clip-title").lastModifiedBy = "user";
  findClip(conflictTimeline, "clip-title").lastModifiedAt = Date.now();
  const conflictCtx = new TimelineContext(conflictTimeline);
  const conflict = conflictCtx.batchUpdateClips({
    selector: { type: "text" },
    updates: { "style.color": "#000000" },
  });
  assert(conflict.requiresConfirmation, "batchUpdateClips reports E2010 conflicts");
  assert(conflict.conflictClips.length === 1, "batchUpdateClips returns conflict clips");
  assert(!conflictCtx.changed, "batchUpdateClips conflict keeps timeline unchanged");

  let sourceReplaceThrown = false;
  try {
    ctx.batchUpdateClips({
      selector: { type: "text" },
      updates: { source: { kind: "inline", content: "Bad" } },
    });
  } catch (error) {
    sourceReplaceThrown = error.message.includes("禁止直接替换整个 source");
  }
  assert(sourceReplaceThrown, "batchUpdateClips rejects whole source replacement");

  const shiftCtx = new TimelineContext(buildTimeline());
  dryRun = shiftCtx.batchShiftClips({
    selector: { type: "text", timeRange: { startInFrames: 0, endInFrames: 60 } },
    offsetInFrames: 30,
    dryRun: true,
  });
  assert(dryRun.matchedCount === 2, "batchShiftClips matches timeRange");
  assert(findClip(shiftCtx.timeline, "clip-title").startInFrames === 0, "shift dryRun keeps timeline");

  const shifted = shiftCtx.batchShiftClips({
    selector: { type: "text", timeRange: { startInFrames: 0, endInFrames: 60 } },
    offsetInFrames: 30,
  });
  assert(shifted.shiftedCount === 2, "batchShiftClips shifts matched clips");
  assert(findClip(shiftCtx.timeline, "clip-title").startInFrames === 30, "batchShiftClips shifts first");
  assert(
    findClip(shiftCtx.timeline, "clip-subtitle").startInFrames === 60,
    "batchShiftClips shifts second without false overlap",
  );

  const deleteCtx = new TimelineContext(buildTimeline());
  dryRun = deleteCtx.batchDeleteClips({
    selector: { type: "text" },
  });
  assert(dryRun.requiresConfirmation, "batchDeleteClips asks confirmation for multiple clips");
  assert(deleteCtx.timeline.tracks[0].clips.length === 3, "batchDeleteClips default dryRun keeps clips");

  const deletedOne = deleteCtx.batchDeleteClips({
    selector: { nameIncludes: "结尾" },
    dryRun: false,
  });
  assert(deletedOne.deletedCount === 1, "batchDeleteClips deletes single clip without confirmDelete");
  assert(!findClip(deleteCtx.timeline, "clip-ending"), "batchDeleteClips removes single clip");

  const deletedMany = deleteCtx.batchDeleteClips({
    selector: { type: "text" },
    dryRun: false,
    confirmDelete: true,
  });
  assert(deletedMany.deletedCount === 2, "batchDeleteClips deletes multiple with confirmation");
  assert(deleteCtx.timeline.tracks[0].clips.length === 0, "batchDeleteClips removes remaining text clips");

  console.log("test-agent-batch-tools: passed");
}

main();
