const { getPresetById, defaultPropsFromPreset } = require("../src/main/agent/preset-catalog");
const { placePresetOnTimeline } = require("../src/main/agent/place-preset");

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
  const popping = getPresetById("rve-popping-text");
  assert(popping?.parameters?.length >= 1, "title preset has parameters");
  assert(popping.parameters.some((p) => p.key === "text"), "text param");

  const lowerThird = getPresetById("rve-lower-third");
  assert(lowerThird?.parameters?.length === 4, "lower-third has 4 params");

  const stat = getPresetById("rve-stat-counter");
  assert(stat?.parameters?.some((p) => p.key === "value"), "stat has value");

  const ken = getPresetById("rve-ken-burns");
  assert(ken?.parameters?.some((p) => p.type === "image"), "ken-burns has imageUrl");

  const manifestCount = require("../resources/presets/manifest.json").filter(
    (item) => Array.isArray(item.parameters) && item.parameters.length > 0,
  ).length;
  assert(manifestCount === 81, `all 81 presets parameterized, got ${manifestCount}`);

  const defaults = defaultPropsFromPreset(popping);
  assert(defaults.text === "BINGO!", "default text from manifest");

  const result = placePresetOnTimeline(BASE_TIMELINE, popping, {
    startInFrames: 0,
    parameters: { text: "EasyMotion" },
  });
  const clip = result.timeline.tracks[0].clips[0];
  assert(clip.source.props.text === "EasyMotion", "override text");

  const chart = placePresetOnTimeline(BASE_TIMELINE, getPresetById("rve-stat-counter"), {
    startInFrames: 0,
    parameters: { value: 9999, title: "Downloads" },
  });
  const chartClip = chart.timeline.tracks[0].clips[0];
  assert(chartClip.source.props.value === 9999, "override numeric value");
  assert(chartClip.source.props.title === "Downloads", "override title");

  console.log("test-preset-parameters: passed");
}

main();
