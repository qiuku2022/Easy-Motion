const CREATION_MODES = new Set(["quick", "free", "auto"]);

const CODE_INTENT =
  /组件|tsx|remotion|interpolate|spring|粒子|custom\/|useCurrentFrame|AbsoluteFill|writeRemotion|patchRemotion|registerCustom|源码/i;
const TIMELINE_INTENT =
  /标题|预设|轨道|片段|背景|渐变|字体|大一点|小一点|删除|淡入|折线|饼图|图表|柱状|颜色|配色/i;

function normalizeCreationMode(mode) {
  return CREATION_MODES.has(mode) ? mode : "free";
}

/** quick=仅 timeline | free=timeline+remotion | auto=按输入关键词路由 */
function resolveCreationMode(mode, userInput = "") {
  const normalized = normalizeCreationMode(mode);
  if (normalized !== "auto") return normalized;

  const input = String(userInput ?? "");
  const code = CODE_INTENT.test(input);
  const timeline = TIMELINE_INTENT.test(input);
  if (timeline && !code) return "quick";
  return "free";
}

function includesRemotionTools(effectiveMode) {
  return effectiveMode !== "quick";
}

module.exports = {
  CREATION_MODES,
  normalizeCreationMode,
  resolveCreationMode,
  includesRemotionTools,
};
