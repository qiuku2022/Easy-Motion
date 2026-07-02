const { placePresetOnTimeline } = require("../src/main/agent/place-preset");
const { getPresetById } = require("../src/main/agent/preset-catalog");
const {
  resolvePresetClipUpdates,
  findPresetClipForInput,
  normalizeClipUpdates,
} = require("../src/main/agent/clip-updates");
const { updateClip } = require("../src/main/agent/timeline-ops");

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
  const lineChart = getPresetById("rve-line-chart");
  const placed = placePresetOnTimeline(BASE_TIMELINE, lineChart, { startInFrames: 0 });
  const clip = placed.timeline.tracks[0].clips[0];

  const updates = resolvePresetClipUpdates(clip, "把折线图的折线和点也换成浅色系");
  assert(updates["source.props.primaryColor"] === "#93c5fd", "light line color");
  assert(updates["source.props.secondaryColor"] === "#fde68a", "light point color");

  const found = findPresetClipForInput(placed.timeline, "折线图改成浅色");
  assert(found?.id === clip.id, "find line chart clip");

  const normalized = normalizeClipUpdates({
    primaryColor: "#abcdef",
    secondaryColor: "#fedcba",
  });
  assert(normalized["source.props.primaryColor"] === "#abcdef", "normalize primaryColor");
  assert(normalized["source.props.secondaryColor"] === "#fedcba", "normalize secondaryColor");

  const applied = updateClip(placed.timeline, {
    clipId: clip.id,
    updates,
  });
  assert(
    applied.timeline.tracks[0].clips[0].source.props.primaryColor === "#93c5fd",
    "updateClip applies preset props"
  );

  console.log("test-preset-clip-updates: passed");
}

main();
