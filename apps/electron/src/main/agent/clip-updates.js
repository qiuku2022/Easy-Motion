const NESTED_OBJECT_KEYS = ["style", "transform", "source"];

function getNestedValue(obj, path) {
  const parts = path.split(".");
  let cursor = obj;
  for (const part of parts) {
    if (cursor == null || typeof cursor !== "object") return undefined;
    cursor = cursor[part];
  }
  return cursor;
}

function hasUpdatePath(updates, path) {
  if (updates[path] !== undefined) return true;
  const [root, leaf] = path.split(".");
  if (!leaf) return false;
  const nested = updates[root];
  return nested && typeof nested === "object" && nested[leaf] !== undefined;
}

/** 将 LLM 常见误写（根级 fontSize、嵌套 style 对象）统一为点路径更新 */
function normalizeClipUpdates(updates = {}) {
  const normalized = { ...updates };

  if (normalized.fontSize !== undefined && !hasUpdatePath(normalized, "style.fontSize")) {
    normalized["style.fontSize"] = normalized.fontSize;
    delete normalized.fontSize;
  }

  if (normalized.color !== undefined && !hasUpdatePath(normalized, "style.color")) {
    normalized["style.color"] = normalized.color;
    delete normalized.color;
  }

  if (
    normalized.backgroundColor !== undefined &&
    !hasUpdatePath(normalized, "style.backgroundColor") &&
    !hasUpdatePath(normalized, "style.fillColor") &&
    !hasUpdatePath(normalized, "style.background")
  ) {
    normalized["style.backgroundColor"] = normalized.backgroundColor;
    delete normalized.backgroundColor;
  }

  if (
    normalized.background !== undefined &&
    !hasUpdatePath(normalized, "style.background")
  ) {
    normalized["style.background"] = normalized.background;
    delete normalized.background;
  }

  for (const key of ["primaryColor", "secondaryColor", "backgroundColor"]) {
    if (normalized[key] !== undefined && !hasUpdatePath(normalized, `source.props.${key}`)) {
      normalized[`source.props.${key}`] = normalized[key];
      delete normalized[key];
    }
  }

  for (const key of NESTED_OBJECT_KEYS) {
    const value = normalized[key];
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    for (const [subKey, subValue] of Object.entries(value)) {
      const dotPath = `${key}.${subKey}`;
      if (normalized[dotPath] === undefined) {
        normalized[dotPath] = subValue;
      }
    }
    delete normalized[key];
  }

  return normalized;
}

/**
 * 根据用户自然语言对选中片段做相对调整（±20% 等），避免 LLM 用错基准值。
 */
function resolveRelativeClipUpdates(clip, userInput, updates = {}) {
  const normalized = normalizeClipUpdates(updates);
  const text = String(userInput ?? "");

  const wantsBigger = /大(一点|些|点)|变大|增大|放大/.test(text);
  const wantsSmaller = /小(一点|些|点)|变小|减小|缩小/.test(text);
  if (!wantsBigger && !wantsSmaller) return normalized;

  const result = { ...normalized };
  const fontContext = /字|字体|字号|font/i.test(text) || clip?.type === "text";
  const speedContext = /快|慢|速度|时长|动画/.test(text);

  if (fontContext) {
    const current = Number(getNestedValue(clip, "style.fontSize")) || 72;
    const factor = wantsBigger ? 1.2 : 0.8;
    result["style.fontSize"] = Math.max(1, Math.round(current * factor));
    return result;
  }

  if (speedContext && !hasUpdatePath(result, "durationInFrames")) {
    const current = Number(clip?.durationInFrames) || 30;
    if (/快/.test(text)) {
      result.durationInFrames = Math.max(1, Math.round(current / 2));
    } else if (/慢/.test(text)) {
      result.durationInFrames = Math.round(current * 2);
    }
    return result;
  }

  if (/左|右|上|下/.test(text)) {
    const x = Number(getNestedValue(clip, "transform.position.x")) || 0;
    const y = Number(getNestedValue(clip, "transform.position.y")) || 0;
    const offset = Math.round((clip?.timelineWidth ?? 1920) * 0.1) || 100;
    if (/左/.test(text)) result["transform.position.x"] = x - offset;
    if (/右/.test(text)) result["transform.position.x"] = x + offset;
    if (/上/.test(text)) result["transform.position.y"] = y - offset;
    if (/下/.test(text)) result["transform.position.y"] = y + offset;
    return result;
  }

  if (!hasUpdatePath(result, "transform.scale")) {
    const current = Number(getNestedValue(clip, "transform.scale")) || 1;
    const factor = wantsBigger ? 1.2 : 0.8;
    result["transform.scale"] = Math.round(current * factor * 100) / 100;
  }

  return result;
}

const CHART_COMPONENT_HINTS = [
  { pattern: /折线图|折线/i, component: "RveLineChart" },
  { pattern: /饼图/i, component: "RvePieChart" },
  { pattern: /环形图|甜甜圈/i, component: "RveDonutChart" },
  { pattern: /面积图/i, component: "RveAreaChart" },
  { pattern: /对比图/i, component: "RveComparisonChart" },
];

const LIGHT_PRESET_PALETTE = {
  primaryColor: "#93c5fd",
  secondaryColor: "#fde68a",
  backgroundColor: "#4b5563",
};

const DARK_PRESET_PALETTE = {
  primaryColor: "#1e40af",
  secondaryColor: "#9d174d",
  backgroundColor: "#111827",
};

function isPresetAnimationClip(clip) {
  return clip?.type === "animation" && clip?.source?.kind === "component";
}

/** 图表/预设片段配色：LLM 未调工具时的确定性兜底 */
function resolvePresetClipUpdates(clip, userInput) {
  if (!isPresetAnimationClip(clip)) return {};

  const text = String(userInput ?? "");
  const wantsLight = /浅色|淡色|亮色系|浅色系|明亮|浅一点|浅一些/.test(text);
  const wantsDark = /深色|暗色|暗色系|暗一点/.test(text);
  const wantsColorChange = /颜色|配色|色调|色系|换成|改为|改成|换为/.test(text);

  if (!wantsLight && !wantsDark && !wantsColorChange) return {};

  const mentionsLine = /折线|曲线|线条/.test(text);
  const mentionsPoint = /(?:数据)?点|圆点/.test(text);
  const mentionsBg = /背景/.test(text);
  const mentionsChart = /折线图|饼图|环形图|面积图|柱状图|图表|对比图/.test(text);
  const isChartComponent = /Chart|Counter|Stat/i.test(clip.source?.component ?? "");

  if (!mentionsChart && !mentionsLine && !mentionsPoint && !mentionsBg && !isChartComponent) {
    return {};
  }

  const palette = wantsDark ? DARK_PRESET_PALETTE : LIGHT_PRESET_PALETTE;
  const result = {};
  const applyPrimary = mentionsLine || mentionsChart || (!mentionsPoint && !mentionsBg);
  const applySecondary = mentionsPoint || mentionsChart || (!mentionsLine && !mentionsBg);
  const applyBg = mentionsBg;

  if (applyPrimary) result["source.props.primaryColor"] = palette.primaryColor;
  if (applySecondary) result["source.props.secondaryColor"] = palette.secondaryColor;
  if (applyBg) result["source.props.backgroundColor"] = palette.backgroundColor;

  if (Object.keys(result).length === 0) {
    result["source.props.primaryColor"] = palette.primaryColor;
    result["source.props.secondaryColor"] = palette.secondaryColor;
  }

  return result;
}

function findPresetClipForInput(timeline, userInput) {
  const text = String(userInput ?? "");

  for (const hint of CHART_COMPONENT_HINTS) {
    if (!hint.pattern.test(text)) continue;
    for (const track of timeline.tracks ?? []) {
      for (const clip of track.clips ?? []) {
        if (clip.source?.component === hint.component) return clip;
      }
    }
  }

  let found = null;
  for (const track of timeline.tracks ?? []) {
    for (const clip of track.clips ?? []) {
      if (!isPresetAnimationClip(clip)) continue;
      if (!/Chart|Counter|Stat/i.test(clip.source?.component ?? "")) continue;
      if (found) return null;
      found = clip;
    }
  }
  return found;
}

function prepareClipUpdates(clip, { userInput, updates, selectedClipId, clipId }) {
  let prepared = normalizeClipUpdates(updates);
  if (userInput && selectedClipId && clipId === selectedClipId) {
    prepared = resolveRelativeClipUpdates(clip, userInput, prepared);
  }
  return prepared;
}

module.exports = {
  normalizeClipUpdates,
  resolveRelativeClipUpdates,
  resolvePresetClipUpdates,
  findPresetClipForInput,
  prepareClipUpdates,
  getNestedValue,
};
