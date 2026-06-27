import type { Clip, Keyframe, KeyframeEasing, KeyframeInterpolation } from "@/types/timeline";
import { getValueByPath } from "@/lib/timeline/objectPath";
import { newId } from "@/lib/timeline/mutations";
import { applySegmentEasing } from "@/lib/timeline/keyframeEasing";
import { normalizeKeyframePropertyValue } from "@/lib/timeline/positionProperty";

export const VALID_KEYFRAME_EASING = [
  "linear",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "spring",
] as const;

export const VALID_KEYFRAME_INTERPOLATION = ["linear", "bezier", "hold"] as const;

export const KEYFRAME_ANIMATABLE_PROPERTIES = [
  { path: "transform.opacity", label: "透明度 (%)" },
  { path: "transform.position.x", label: "锚点 X" },
  { path: "transform.position.y", label: "锚点 Y" },
  { path: "transform.scale", label: "缩放 (%)" },
  { path: "transform.rotation", label: "旋转" },
  { path: "style.fontSize", label: "字体大小" },
  { path: "style.color", label: "颜色" },
] as const;

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

function resolveBaseValue(property: string, baseValue: unknown): unknown {
  if (baseValue !== undefined && baseValue !== null) return baseValue;
  if (property === "transform.opacity") return 1;
  if (property === "transform.scale") return 1;
  if (property === "transform.rotation") return 0;
  return baseValue;
}

export function interpolateKeyframeProperty(
  keyframes: Keyframe[],
  property: string,
  frame: number,
  baseValue: unknown,
  fps = 30,
) {
  const resolvedBase = resolveBaseValue(property, baseValue);
  const sorted = keyframes
    .filter((kf) => kf.property === property)
    .sort((a, b) => a.frame - b.frame);

  if (sorted.length === 0) return resolvedBase;
  if (frame <= sorted[0]!.frame) {
    return frame < sorted[0]!.frame ? resolvedBase : sorted[0]!.value;
  }
  const last = sorted[sorted.length - 1]!;
  if (frame >= last.frame) return last.value;

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const start = sorted[i]!;
    const end = sorted[i + 1]!;
    if (frame < start.frame || frame > end.frame) continue;
    if (end.interpolation === "hold") return start.value;
    const span = end.frame - start.frame;
    if (span <= 0) return end.value;
    const rawT = (frame - start.frame) / span;
    const localFrame = frame - start.frame;
    const t = applySegmentEasing(rawT, end, span, localFrame, fps);
    if (typeof start.value === "number" && typeof end.value === "number") {
      return start.value + (end.value - start.value) * t;
    }
    return frame >= end.frame ? end.value : start.value;
  }

  return resolvedBase;
}

export function applyKeyframesToClip(clip: Clip, relativeFrame: number, fps = 30) {
  const keyframes = clip.keyframes ?? [];
  const base = {
    transform: { ...(clip.transform ?? {}) },
    style: { ...(clip.style ?? {}) },
  };
  if (keyframes.length === 0) return base;

  const properties = [...new Set(keyframes.map((kf) => kf.property))];
  let result: Record<string, unknown> = { ...base };

  for (const property of properties) {
    const baseValue = resolveBaseValue(
      property,
      getValueByPath(clip as Record<string, unknown>, property),
    );
    const value = interpolateKeyframeProperty(
      keyframes,
      property,
      relativeFrame,
      baseValue,
      fps,
    );
    result = setValueByPath(result, property, value);
  }

  return result as {
    transform: Record<string, unknown>;
    style: Record<string, unknown>;
  };
}

export function listKeyframeProperties(keyframes: Keyframe[]) {
  return [...new Set(keyframes.map((kf) => kf.property))].sort();
}

export function getClipRelativeFrame(globalFrame: number, clip: Clip): number {
  return Math.max(
    0,
    Math.min(globalFrame - clip.startInFrames, clip.durationInFrames - 1),
  );
}

export function resolveClipAtFrame(clip: Clip, relativeFrame: number) {
  return applyKeyframesToClip(clip, relativeFrame);
}

export function getPropertyValueAtFrame(
  clip: Clip,
  property: string,
  relativeFrame: number,
  fps = 30,
): unknown {
  const base = resolveBaseValue(
    property,
    getValueByPath(clip as Record<string, unknown>, property),
  );
  return interpolateKeyframeProperty(
    clip.keyframes ?? [],
    property,
    relativeFrame,
    base,
    fps,
  );
}

export function addClipKeyframe(
  clip: Clip,
  input: {
    property: string;
    frame: number;
    value?: unknown;
    easing?: KeyframeEasing;
    interpolation?: KeyframeInterpolation;
  },
): Clip {
  const frame = Math.round(input.frame);
  if (frame < 0 || frame >= clip.durationInFrames) {
    throw new Error("关键帧须落在片段时长内");
  }

  const rawValue =
    input.value !== undefined
      ? input.value
      : getValueByPath(clip as Record<string, unknown>, input.property);
  const value = normalizeKeyframePropertyValue(input.property, rawValue);

  const keyframe: Keyframe = {
    id: newId("kf"),
    property: input.property,
    frame,
    value: value as Keyframe["value"],
    easing: input.easing ?? "ease-in-out",
    interpolation: input.interpolation ?? "linear",
  };

  const keyframes = [...(clip.keyframes ?? [])];
  const existingIndex = keyframes.findIndex(
    (item) => item.property === keyframe.property && item.frame === frame,
  );
  if (existingIndex >= 0) {
    keyframes[existingIndex] = {
      ...keyframes[existingIndex]!,
      ...keyframe,
      id: keyframes[existingIndex]!.id,
    };
  } else {
    keyframes.push(keyframe);
  }

  keyframes.sort((a, b) => a.frame - b.frame || a.property.localeCompare(b.property));

  return {
    ...clip,
    keyframes,
    lastModifiedBy: "user",
    lastModifiedAt: Date.now(),
  };
}

export function removeClipKeyframe(clip: Clip, keyframeId: string): Clip {
  const keyframes = (clip.keyframes ?? []).filter((kf) => kf.id !== keyframeId);
  return {
    ...clip,
    keyframes,
    lastModifiedBy: "user",
    lastModifiedAt: Date.now(),
  };
}

export function moveClipKeyframe(
  clip: Clip,
  keyframeId: string,
  newFrame: number,
): Clip {
  const frame = Math.round(newFrame);
  if (frame < 0 || frame >= clip.durationInFrames) {
    throw new Error("关键帧须落在片段时长内");
  }

  const keyframes = (clip.keyframes ?? []).map((kf) =>
    kf.id === keyframeId ? { ...kf, frame } : kf,
  );

  const moved = keyframes.find((kf) => kf.id === keyframeId);
  if (!moved) throw new Error("关键帧不存在");

  const conflict = keyframes.some(
    (kf) =>
      kf.id !== keyframeId &&
      kf.property === moved.property &&
      kf.frame === frame,
  );
  if (conflict) throw new Error("该帧已有同属性关键帧");

  keyframes.sort((a, b) => a.frame - b.frame || a.property.localeCompare(b.property));

  return {
    ...clip,
    keyframes,
    lastModifiedBy: "user",
    lastModifiedAt: Date.now(),
  };
}

export function updateClipKeyframe(
  clip: Clip,
  keyframeId: string,
  patch: Partial<
    Pick<
      Keyframe,
      "value" | "easing" | "interpolation" | "bezierCp" | "springConfig"
    >
  >,
): Clip {
  const keyframes = (clip.keyframes ?? []).map((kf) => {
    if (kf.id !== keyframeId) return kf;
    const next = { ...kf, ...patch };
    if (patch.value !== undefined) {
      next.value = normalizeKeyframePropertyValue(
        kf.property,
        patch.value,
      ) as Keyframe["value"];
    }
    return next;
  });
  if (!keyframes.some((kf) => kf.id === keyframeId)) {
    throw new Error("关键帧不存在");
  }
  return {
    ...clip,
    keyframes,
    lastModifiedBy: "user",
    lastModifiedAt: Date.now(),
  };
}
