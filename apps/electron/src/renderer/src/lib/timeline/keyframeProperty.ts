import type { Clip, Keyframe } from "@/types/timeline";
import { KEYFRAME_ANIMATABLE_PROPERTIES } from "@/lib/timeline/keyframes";

const ANIMATABLE_PATHS = new Set(
  KEYFRAME_ANIMATABLE_PROPERTIES.map((item) => item.path),
);

export function isAnimatableProperty(path: string): boolean {
  return ANIMATABLE_PATHS.has(path);
}

export function clipHasKeyframesForProperty(clip: Clip, property: string): boolean {
  return (clip.keyframes ?? []).some((kf) => kf.property === property);
}

export function findKeyframeAtFrame(
  clip: Clip,
  property: string,
  relativeFrame: number,
): Keyframe | undefined {
  return (clip.keyframes ?? []).find(
    (kf) => kf.property === property && kf.frame === relativeFrame,
  );
}

export function findKeyframeById(clip: Clip, keyframeId: string): Keyframe | undefined {
  return (clip.keyframes ?? []).find((kf) => kf.id === keyframeId);
}
