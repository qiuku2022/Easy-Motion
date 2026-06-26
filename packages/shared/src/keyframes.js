/** @typedef {{ id: string; property: string; frame: number; value: unknown; easing?: string; interpolation?: string }} Keyframe */

const VALID_EASING = ["linear", "ease-in", "ease-out", "ease-in-out", "spring"];
const VALID_INTERPOLATION = ["linear", "bezier", "hold"];

function getValueByPath(obj, path) {
  const parts = String(path).split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = current[part];
  }
  return current;
}

function setValueByPath(obj, path, value) {
  const parts = String(path).split(".");
  const root = { ...obj };
  let current = root;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    const next = current[part];
    const cloned =
      next != null && typeof next === "object" && !Array.isArray(next)
        ? { ...next }
        : {};
    current[part] = cloned;
    current = cloned;
  }
  current[parts[parts.length - 1]] = value;
  return root;
}

function applyEasing(name, t) {
  const clamped = Math.max(0, Math.min(1, t));
  switch (name) {
    case "ease-in":
      return clamped * clamped;
    case "ease-out":
      return clamped * (2 - clamped);
    case "ease-in-out":
      return clamped < 0.5
        ? 2 * clamped * clamped
        : -1 + (4 - 2 * clamped) * clamped;
    case "spring":
      return 1 - Math.cos(clamped * Math.PI * 0.5);
    case "linear":
    default:
      return clamped;
  }
}

function lerpNumber(a, b, t) {
  return a + (b - a) * t;
}

/**
 * @param {Keyframe[]} keyframes
 * @param {string} property
 * @param {number} frame clip-relative frame
 * @param {unknown} baseValue
 */
function interpolateKeyframeProperty(keyframes, property, frame, baseValue) {
  const sorted = keyframes
    .filter((kf) => kf.property === property)
    .sort((a, b) => a.frame - b.frame);

  if (sorted.length === 0) return baseValue;

  if (frame <= sorted[0].frame) {
    if (frame < sorted[0].frame) {
      return baseValue;
    }
    return sorted[0].value;
  }

  const last = sorted[sorted.length - 1];
  if (frame >= last.frame) {
    return last.value;
  }

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (frame < start.frame || frame > end.frame) continue;

    if (end.interpolation === "hold" || start.interpolation === "hold") {
      return start.value;
    }

    const span = end.frame - start.frame;
    if (span <= 0) return end.value;

    const rawT = (frame - start.frame) / span;
    const t = applyEasing(end.easing ?? "linear", rawT);

    if (typeof start.value === "number" && typeof end.value === "number") {
      return lerpNumber(start.value, end.value, t);
    }

    return frame >= end.frame ? end.value : start.value;
  }

  return baseValue;
}

/**
 * @param {{ transform?: Record<string, unknown>; style?: Record<string, unknown>; keyframes?: Keyframe[] }} clip
 * @param {number} relativeFrame
 */
function applyKeyframesToClip(clip, relativeFrame) {
  const keyframes = Array.isArray(clip.keyframes) ? clip.keyframes : [];
  if (keyframes.length === 0) {
    return {
      transform: clip.transform ?? {},
      style: clip.style ?? {},
    };
  }

  const base = {
    transform: { ...(clip.transform ?? {}) },
    style: { ...(clip.style ?? {}) },
  };

  const properties = [...new Set(keyframes.map((kf) => kf.property))];
  let result = { ...base };

  for (const property of properties) {
    const baseValue = getValueByPath(base, property);
    const value = interpolateKeyframeProperty(
      keyframes,
      property,
      relativeFrame,
      baseValue,
    );
    result = setValueByPath(result, property, value);
  }

  return result;
}

function listKeyframeProperties(keyframes) {
  return [...new Set((keyframes ?? []).map((kf) => kf.property))].sort();
}

module.exports = {
  VALID_KEYFRAME_EASING: VALID_EASING,
  VALID_KEYFRAME_INTERPOLATION: VALID_INTERPOLATION,
  getValueByPath,
  setValueByPath,
  interpolateKeyframeProperty,
  applyKeyframesToClip,
  listKeyframeProperties,
};
