const fs = require("node:fs");
const path = require("node:path");

const MANIFEST_PATH = path.join(
  __dirname,
  "../../../resources/presets/manifest.json",
);

/** @type {import("../../../src/renderer/src/types/preset").PresetDefinition[] | null} */
let cachedManifest = null;

function loadManifest() {
  if (cachedManifest) return cachedManifest;
  if (!fs.existsSync(MANIFEST_PATH)) {
    cachedManifest = [];
    return cachedManifest;
  }
  cachedManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  return cachedManifest;
}

function scoreMatch(text, query) {
  const hay = String(text ?? "").toLowerCase();
  const needle = String(query ?? "").toLowerCase().trim();
  if (!needle) return 0;
  if (hay === needle) return 1;
  if (hay.includes(needle)) return 0.85;
  const tokens = needle.split(/\s+/).filter(Boolean);
  const hits = tokens.filter((token) => hay.includes(token)).length;
  return hits / tokens.length;
}

function scorePreset(preset, query) {
  const scores = [
    scoreMatch(preset.id, query),
    scoreMatch(preset.name, query),
    scoreMatch(preset.description, query),
    scoreMatch(preset.component, query),
  ];
  return Math.max(...scores);
}

function getPresetById(presetId) {
  return loadManifest().find((item) => item.id === presetId) ?? null;
}

function searchPresets({ query = "", category, limit = 10 } = {}) {
  const q = String(query).trim();
  let items = loadManifest().filter((item) => item.kind === "component");

  if (category && category !== "all") {
    items = items.filter((item) => item.category === category);
  }

  const ranked = items
    .map((preset) => ({
      preset,
      confidence: q ? scorePreset(preset, q) : 0.5,
    }))
    .filter((item) => (q ? item.confidence > 0.2 : true))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, Math.max(1, Math.min(limit, 20)));

  return ranked.map(({ preset, confidence }) => ({
    id: preset.id,
    name: preset.name,
    description: preset.description,
    category: preset.category,
    component: preset.component,
    durationInFrames: preset.durationInFrames,
    confidence,
  }));
}

function resolvePreset({ presetId, presetName }) {
  if (presetId) {
    const preset = getPresetById(presetId);
    if (!preset) {
      throw new Error(`预设不存在: ${presetId}`);
    }
    return preset;
  }

  if (presetName) {
    const matches = searchPresets({ query: presetName, limit: 5 });
    if (!matches.length) {
      throw new Error(`未找到匹配的预设: ${presetName}`);
    }
    if (matches.length > 1 && matches[0].confidence - matches[1].confidence < 0.05) {
      const names = matches
        .slice(0, 3)
        .map((item) => `「${item.name}」(${item.id})`)
        .join("、");
      throw new Error(`预设名称不明确，请指定 presetId。候选：${names}`);
    }
    if (matches[0].confidence < 0.35) {
      throw new Error(`未找到足够匹配的预设: ${presetName}`);
    }
    return getPresetById(matches[0].id);
  }

  throw new Error("请提供 presetId 或 presetName");
}

const CATEGORY_HINTS = {
  background: "背景动效",
  title: "文字标题动画",
  "data-chart": "数据图表",
  "intro-outro": "片头片尾",
  "social-media": "图片/媒体布局",
  content: "内容动效",
  transition: "转场效果",
};

function defaultPropsFromPreset(preset) {
  const props = {};
  for (const param of preset.parameters ?? []) {
    props[param.key] = param.defaultValue;
  }
  return props;
}

function getPresetCatalogSummary() {
  const manifest = loadManifest();
  const lines = ["内置 Remotion 预设库（81 个组件预设）："];
  for (const [category, hint] of Object.entries(CATEGORY_HINTS)) {
    const samples = manifest
      .filter((item) => item.category === category)
      .slice(0, 3)
      .map((item) => item.name)
      .join("、");
    lines.push(`- ${hint}（${category}）：如 ${samples || "—"}`);
  }
  lines.push("用 listPresets 按名称/分类查询；用 applyPreset 应用到 animation 轨道。");
  return lines.join("\n");
}

module.exports = {
  loadManifest,
  getPresetById,
  searchPresets,
  resolvePreset,
  defaultPropsFromPreset,
  getPresetCatalogSummary,
};
