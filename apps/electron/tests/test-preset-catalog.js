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
  assert(summary.includes("Bits"), "catalog summary mentions Bits library");

  const chart = getPresetById("rve-chart-animation");
  assert(chart?.name === "柱状图动画", "getPresetById loads manifest");

  const bitsFade = getPresetById("bits-fade-in");
  assert(bitsFade?.component === "BitsFadeIn", "bits-fade-in is in manifest");

  const search = searchPresets({ query: "缩放弹出", limit: 3 });
  assert(search.length >= 1, "searchPresets returns matches");
  assert(search[0].id === "rve-popping-text", "search finds popping text preset");

  const bitsSearch = searchPresets({ query: "矩阵雨", limit: 3 });
  assert(
    bitsSearch.some((item) => item.id === "bits-matrix-rain"),
    "search finds Bits matrix rain"
  );

  const resolved = resolvePreset({ presetName: "柱状图" });
  assert(resolved.id === "rve-chart-animation", "resolvePreset by Chinese name");

  console.log("test-preset-catalog: passed");
}

main();
