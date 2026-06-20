const { placePresetOnTimeline } = require("../src/main/agent/place-preset");
const { getPresetById } = require("../src/main/agent/preset-catalog");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const BASE_TIMELINE = {
  version: "1.0",
  fps: 30,
  durationInFrames: 300,
  width: 1280,
  height: 720,
  tracks: [],
};

function main() {
  const preset = getPresetById("rve-popping-text");
  assert(preset, "preset exists");

  const result = placePresetOnTimeline(BASE_TIMELINE, preset, {
    startInFrames: 45,
    parameters: { text: "Agent" },
  });

  assert(result.timeline.tracks.length === 1, "creates animation track");
  assert(result.timeline.tracks[0].type === "animation", "track type animation");

  const clip = result.timeline.tracks[0].clips[0];
  assert(clip.startInFrames === 45, "clip start frame");
  assert(clip.source.component === "RvePoppingText", "component name");
  assert(clip.source.presetId === "rve-popping-text", "preset id on source");
  assert(clip.source.props?.text === "Agent", "parameters stored in props");
  assert(result.clipId === clip.id, "returns clip id");

  console.log("test-place-preset: passed");
}

main();
