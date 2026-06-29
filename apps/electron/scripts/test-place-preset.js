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
  assert(clip.durationInFrames === preset.durationInFrames, "full preset duration");

  const shortTimeline = { ...BASE_TIMELINE, durationInFrames: 30, tracks: [] };
  const onShort = placePresetOnTimeline(shortTimeline, preset, { startInFrames: 0 });
  const shortClip = onShort.timeline.tracks[0].clips[0];
  assert(
    shortClip.durationInFrames === preset.durationInFrames,
    "preset not truncated on short timeline",
  );
  assert(
    onShort.timeline.durationInFrames >= preset.durationInFrames,
    "timeline extended for preset",
  );

  const occupied = placePresetOnTimeline(BASE_TIMELINE, preset, { startInFrames: 0 });
  const stacked = placePresetOnTimeline(occupied.timeline, preset, { startInFrames: 0 });
  assert(
    stacked.timeline.tracks.filter((track) => track.type === "animation").length === 2,
    "overlap creates a new animation track",
  );
  assert(
    stacked.timeline.tracks[1].clips[0].startInFrames === 0,
    "stacked preset keeps playhead start",
  );

  console.log("test-place-preset: passed");
}

main();
