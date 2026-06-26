import { Easing, interpolate, spring } from "remotion";

export type TimelineKeyframe = {
  id: string;
  property: string;
  frame: number;
  value: unknown;
  easing?: string;
  interpolation?: string;
  bezierCp?: { x1: number; y1: number; x2: number; y2: number };
  springConfig?: { damping: number; stiffness: number; mass?: number };
};

const DEFAULT_BEZIER = { x1: 0.42, y1: 0, x2: 0.58, y2: 1 };
const DEFAULT_SPRING = { damping: 12, stiffness: 120, mass: 1 };

function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setValueByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const parts = path.split(".");
  const root = { ...obj };
  let current = root;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i]!;
    const next = current[part];
    const cloned =
      next != null && typeof next === "object" && !Array.isArray(next)
        ? { ...(next as Record<string, unknown>) }
        : {};
    current[part] = cloned;
    current = cloned;
  }
  current[parts[parts.length - 1]!] = value;
  return root;
}

function mapEasing(name?: string) {
  switch (name) {
    case "ease-in":
      return Easing.in(Easing.ease);
    case "ease-out":
      return Easing.out(Easing.ease);
    case "ease-in-out":
      return Easing.inOut(Easing.ease);
    case "linear":
    default:
      return Easing.linear;
  }
}

function segmentProgress(
  start: TimelineKeyframe,
  end: TimelineKeyframe,
  frame: number,
  fps: number,
) {
  const span = end.frame - start.frame;
  const localFrame = frame - start.frame;
  const rawT = span > 0 ? localFrame / span : 1;

  if (end.easing === "spring") {
    const cfg = { ...DEFAULT_SPRING, ...(end.springConfig ?? {}) };
    return spring({
      frame: localFrame,
      fps,
      config: {
        damping: cfg.damping,
        stiffness: cfg.stiffness,
        mass: cfg.mass ?? 1,
      },
      durationInFrames: Math.max(1, span),
    });
  }

  if (end.interpolation === "bezier") {
    const cp = end.bezierCp ?? DEFAULT_BEZIER;
    return Easing.bezier(cp.x1, cp.y1, cp.x2, cp.y2)(rawT);
  }

  return mapEasing(end.easing)(rawT);
}

function interpolateProperty(
  keyframes: TimelineKeyframe[],
  property: string,
  frame: number,
  baseValue: unknown,
  fps: number,
) {
  const sorted = keyframes
    .filter((kf) => kf.property === property)
    .sort((a, b) => a.frame - b.frame);

  if (sorted.length === 0) return baseValue;
  if (frame <= sorted[0]!.frame) {
    return frame < sorted[0]!.frame ? baseValue : sorted[0]!.value;
  }
  const last = sorted[sorted.length - 1]!;
  if (frame >= last.frame) return last.value;

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const start = sorted[i]!;
    const end = sorted[i + 1]!;
    if (frame < start.frame || frame > end.frame) continue;
    if (end.interpolation === "hold") return start.value;

    if (typeof start.value === "number" && typeof end.value === "number") {
      const progress = segmentProgress(start, end, frame, fps);
      return interpolate(progress, [0, 1], [start.value, end.value], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    }

    return frame >= end.frame ? end.value : start.value;
  }

  return baseValue;
}

export function applyKeyframesToClip(
  clip: {
    transform?: Record<string, unknown>;
    style?: Record<string, unknown>;
    keyframes?: TimelineKeyframe[];
  },
  relativeFrame: number,
  fps = 30,
) {
  const keyframes = clip.keyframes ?? [];
  const base = {
    transform: { ...(clip.transform ?? {}) },
    style: { ...(clip.style ?? {}) },
  };
  if (keyframes.length === 0) return base;

  const properties = [...new Set(keyframes.map((kf) => kf.property))];
  let result: Record<string, unknown> = { ...base };

  for (const property of properties) {
    const baseValue = getValueByPath(base, property);
    const value = interpolateProperty(keyframes, property, relativeFrame, baseValue, fps);
    result = setValueByPath(result, property, value);
  }

  return result as {
    transform: {
      position: { x: number; y: number };
      scale: number;
      rotation: number;
      opacity: number;
    };
    style: Record<string, unknown>;
  };
}
