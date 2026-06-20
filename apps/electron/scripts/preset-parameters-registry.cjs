/** Parameter definitions for all 81 RVE presets (generated from preset-parameters-data.json). */
const PRESET_PARAMETER_ENTRIES = require("./preset-parameters-data.json");

/** @type {Record<string, import('./preset-parameters-data.json')[0]['parameters']>} */
const PRESET_PARAMETERS_BY_ID = Object.fromEntries(
  PRESET_PARAMETER_ENTRIES.map((entry) => [entry.id, entry.parameters]),
);

/** Map manifest parameter keys to local variable names inside components. */
const PARAM_LOCAL_NAMES = {
  "rve-ken-burns": { value: "scale" },
  "rve-parallax-pan": { value: "scale" },
  "rve-zoom-pulse": { value: "maxScale" },
};

/** Extra const lines after props block for hand-adapted components. */
const EXTRA_PROPS_LINES = {
  "rve-ken-burns": [
    "  const duration = 20;",
    "  const translateX = -50;",
    "  const translateY = -30;",
  ],
  "rve-zoom-pulse": [
    "  const duration = 4;",
    "  const minScale = 1;",
  ],
  "rve-parallax-pan": [
    "  const duration = 15;",
  ],
};

module.exports = {
  PRESET_PARAMETER_ENTRIES,
  PRESET_PARAMETERS_BY_ID,
  PARAM_LOCAL_NAMES,
  EXTRA_PROPS_LINES,
};
