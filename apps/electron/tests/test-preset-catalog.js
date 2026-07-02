const {
  getPresetById,
  searchPresets,
  resolvePreset,
  getPresetCatalogSummary,
} = require("../src/main/agent/preset-catalog");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const summary = getPresetCatalogSummary();
  assert(summary.includes("listPresets"), "catalog summary mentions listPresets");
  assert(summary.includes("data-chart"), "catalog summary includes chart category");

  const chart = getPresetById("rve-chart-animation");
  assert(chart?.name === "柱状图动画", "getPresetById loads manifest");

  const search = searchPresets({ query: "缩放弹出", limit: 3 });
  assert(search.length >= 1, "searchPresets returns matches");
  assert(search[0].id === "rve-popping-text", "search finds popping text preset");

  const resolved = resolvePreset({ presetName: "柱状图" });
  assert(resolved.id === "rve-chart-animation", "resolvePreset by Chinese name");

  console.log("test-preset-catalog: passed");
}

main();
