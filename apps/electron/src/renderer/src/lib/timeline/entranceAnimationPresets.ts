import type { Clip, Keyframe } from "@/types/timeline";
import type { ClipPatch } from "@/lib/timeline/mutations";

export type EntranceAnimationPresetId =
  | "none"
  | "fade"
  | "fade-up"
  | "fade-down"
  | "slide-left"
  | "slide-right"
  | "zoom-in"
  | "zoom-out"
  | "pop"
  | "rotate-in";

export interface EntranceAnimationPreset {
  id: EntranceAnimationPresetId;
  label: string;
  description: string;
}

type CanvasSize = { width: number; height: number };

type BaseTransform = {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  rotation: number;
};

const GENERATED_KEYFRAME_PREFIX = "kf-in-";
const DEFAULT_DURATION = 18;
const DEFAULT_DISTANCE = 96;

export const ENTRANCE_ANIMATION_PRESETS: EntranceAnimationPreset[] = [
  { id: "none", label: "无", description: "不生成入场关键帧" },
  { id: "fade", label: "淡入", description: "透明度从 0 到当前值" },
  { id: "fade-up", label: "上移淡入", description: "从下方轻微上移并淡入" },
  { id: "fade-down", label: "下移淡入", description: "从上方轻微下移并淡入" },
  { id: "slide-left", label: "左侧滑入", description: "从左侧滑到当前位置" },
  { id: "slide-right", label: "右侧滑入", description: "从右侧滑到当前位置" },
  { id: "zoom-in", label: "放大淡入", description: "从较小尺寸放大到当前尺寸" },
  { id: "zoom-out", label: "缩小淡入", description: "从较大尺寸缩小到当前尺寸" },
  { id: "pop", label: "弹入", description: "带轻微过冲的缩放入场" },
  { id: "rotate-in", label: "旋入", description: "轻微旋转并淡入到当前角度" },
];

const PRESET_IDS = new Set<EntranceAnimationPresetId>(
  ENTRANCE_ANIMATION_PRESETS.map((preset) => preset.id),
);

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function generatedKeyframeId(
  presetId: EntranceAnimationPresetId,
  property: string,
  frame: number,
): string {
  const safeProperty = property.replaceAll(".", "-");
  return `${GENERATED_KEYFRAME_PREFIX}${presetId}-${safeProperty}-${frame}-${crypto.randomUUID()}`;
}

function keyframe(
  presetId: EntranceAnimationPresetId,
  property: string,
  frame: number,
  value: number,
  easing: Keyframe["easing"] = "ease-out",
): Keyframe {
  return {
    id: generatedKeyframeId(presetId, property, frame),
    property,
    frame,
    value,
    easing,
    interpolation: "linear",
  };
}

function isEntrancePresetId(value: unknown): value is EntranceAnimationPresetId {
  return typeof value === "string" && PRESET_IDS.has(value as EntranceAnimationPresetId);
}

function readStoredDuration(clip: Clip): number | null {
  const raw = clip.source?.entranceAnimationDurationInFrames;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  return null;
}

export function getEntranceAnimationPreset(
  clip: Clip,
): EntranceAnimationPresetId {
  const stored = clip.source?.entranceAnimationPresetId;
  if (isEntrancePresetId(stored)) return stored;

  const legacyType = clip.animations?.in?.type;
  if (legacyType === "fade") return "fade";
  if (legacyType === "slide-up") return "fade-up";
  if (legacyType === "slide-down") return "fade-down";
  if (legacyType === "slide-left") return "slide-left";
  if (legacyType === "slide-right") return "slide-right";
  if (legacyType === "scale-up") return "zoom-in";
  if (legacyType === "scale-down") return "zoom-out";
  if (legacyType === "rotate") return "rotate-in";

  return "none";
}

export function getEntranceAnimationDuration(clip: Clip): number {
  return Math.round(
    readStoredDuration(clip) ??
      clip.animations?.in?.durationInFrames ??
      DEFAULT_DURATION,
  );
}

export function clampEntranceAnimationDuration(clip: Clip, value: number): number {
  const max = Math.max(1, clip.durationInFrames - 1);
  const rounded = Math.round(value);
  if (!Number.isFinite(rounded)) return Math.min(DEFAULT_DURATION, max);
  return Math.min(max, Math.max(1, rounded));
}

function resolveBaseTransform(clip: Clip, canvas: CanvasSize): BaseTransform {
  const transform = clip.transform ?? {};
  const position =
    transform.position != null &&
    typeof transform.position === "object" &&
    !Array.isArray(transform.position)
      ? (transform.position as Record<string, unknown>)
      : {};

  return {
    x: finiteNumber(position.x, canvas.width / 2),
    y: finiteNumber(position.y, canvas.height / 2),
    scale: finiteNumber(transform.scale, 1),
    opacity: finiteNumber(transform.opacity, 1),
    rotation: finiteNumber(transform.rotation, 0),
  };
}

function buildPresetKeyframes(
  presetId: EntranceAnimationPresetId,
  base: BaseTransform,
  duration: number,
): Keyframe[] {
  if (presetId === "none" || duration <= 0) return [];

  const end = duration;
  const distance = DEFAULT_DISTANCE;
  const opacity = [
    keyframe(presetId, "transform.opacity", 0, 0, "linear"),
    keyframe(presetId, "transform.opacity", end, base.opacity, "ease-out"),
  ];

  switch (presetId) {
    case "fade":
      return opacity;
    case "fade-up":
      return [
        ...opacity,
        keyframe(presetId, "transform.position.y", 0, base.y - distance, "linear"),
        keyframe(presetId, "transform.position.y", end, base.y, "ease-out"),
      ];
    case "fade-down":
      return [
        ...opacity,
        keyframe(presetId, "transform.position.y", 0, base.y + distance, "linear"),
        keyframe(presetId, "transform.position.y", end, base.y, "ease-out"),
      ];
    case "slide-left":
      return [
        ...opacity,
        keyframe(presetId, "transform.position.x", 0, base.x - distance, "linear"),
        keyframe(presetId, "transform.position.x", end, base.x, "ease-out"),
      ];
    case "slide-right":
      return [
        ...opacity,
        keyframe(presetId, "transform.position.x", 0, base.x + distance, "linear"),
        keyframe(presetId, "transform.position.x", end, base.x, "ease-out"),
      ];
    case "zoom-in":
      return [
        ...opacity,
        keyframe(presetId, "transform.scale", 0, base.scale * 0.82, "linear"),
        keyframe(presetId, "transform.scale", end, base.scale, "ease-out"),
      ];
    case "zoom-out":
      return [
        ...opacity,
        keyframe(presetId, "transform.scale", 0, base.scale * 1.18, "linear"),
        keyframe(presetId, "transform.scale", end, base.scale, "ease-out"),
      ];
    case "pop": {
      const overshootFrame = Math.max(1, Math.round(end * 0.72));
      return [
        ...opacity,
        keyframe(presetId, "transform.scale", 0, base.scale * 0.78, "linear"),
        keyframe(
          presetId,
          "transform.scale",
          overshootFrame,
          base.scale * 1.06,
          "ease-out",
        ),
        keyframe(presetId, "transform.scale", end, base.scale, "ease-in-out"),
      ];
    }
    case "rotate-in":
      return [
        ...opacity,
        keyframe(presetId, "transform.scale", 0, base.scale * 0.9, "linear"),
        keyframe(presetId, "transform.scale", end, base.scale, "ease-out"),
        keyframe(presetId, "transform.rotation", 0, base.rotation - 8, "linear"),
        keyframe(presetId, "transform.rotation", end, base.rotation, "ease-out"),
      ];
    default:
      return [];
  }
}

function isGeneratedEntranceKeyframe(keyframe: Keyframe): boolean {
  return keyframe.id.startsWith(GENERATED_KEYFRAME_PREFIX);
}

function keyframeSlot(keyframe: Pick<Keyframe, "property" | "frame">): string {
  return `${keyframe.property}@${keyframe.frame}`;
}

export function buildEntranceAnimationPatch(
  clip: Clip,
  presetId: EntranceAnimationPresetId,
  durationInFrames: number,
  canvas: CanvasSize,
): ClipPatch {
  const duration = clampEntranceAnimationDuration(clip, durationInFrames);
  const endFrame = Math.min(duration, Math.max(0, clip.durationInFrames - 1));
  const base = resolveBaseTransform(clip, canvas);
  const nextEntranceKeyframes = buildPresetKeyframes(presetId, base, endFrame);
  const replacedSlots = new Set(nextEntranceKeyframes.map(keyframeSlot));
  const existingKeyframes = (clip.keyframes ?? []).filter(
    (item) => !isGeneratedEntranceKeyframe(item) && !replacedSlots.has(keyframeSlot(item)),
  );

  return {
    source: {
      entranceAnimationPresetId: presetId,
      entranceAnimationDurationInFrames: duration,
    },
    animations: {
      in: {
        type: "none",
        durationInFrames: duration,
      },
    },
    keyframes: [...existingKeyframes, ...nextEntranceKeyframes].sort(
      (a, b) => a.frame - b.frame || a.property.localeCompare(b.property),
    ),
  };
}

