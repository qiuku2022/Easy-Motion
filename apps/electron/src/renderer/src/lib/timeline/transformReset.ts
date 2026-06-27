import type { Clip } from "@/types/timeline";
import type { ClipPatch } from "@/lib/timeline/mutations";
import {
  buildPatchFromPropertyPath,
  getClipPropertyValue,
  TRANSFORM_FIELDS,
} from "@/lib/timeline/clipPropertySchema";
import { ensureTransform } from "@/lib/timeline/clipDefaults";
import { areClipPropertyValuesEqual } from "@/lib/timeline/clipFormValues";
import { clipHasKeyframesForProperty } from "@/lib/timeline/keyframeProperty";

export const TRANSFORM_PROPERTY_PATHS = TRANSFORM_FIELDS.map((f) => f.path);

export function getDefaultTransformPropertyValue(
  path: string,
  canvas?: { width: number; height: number },
): unknown {
  const defaults = ensureTransform(undefined, canvas);
  if (path === "transform.position.x") return defaults.position.x;
  if (path === "transform.position.y") return defaults.position.y;
  if (path === "transform.scale") return defaults.scale;
  if (path === "transform.rotation") return defaults.rotation;
  if (path === "transform.opacity") return defaults.opacity;
  throw new Error(`非变换属性：${path}`);
}

export function canResetTransformProperty(
  clip: Clip,
  path: string,
  canvas?: { width: number; height: number },
): boolean {
  if (!TRANSFORM_PROPERTY_PATHS.includes(path)) return false;
  if (clipHasKeyframesForProperty(clip, path)) return true;

  const field = TRANSFORM_FIELDS.find((f) => f.path === path);
  if (!field) return false;

  const current = getClipPropertyValue(clip, path);
  const defaultValue = getDefaultTransformPropertyValue(path, canvas);
  if (current === undefined || current === null) {
    return false;
  }
  return !areClipPropertyValuesEqual(field, current, defaultValue);
}

export function canResetAnyTransformProperty(
  clip: Clip,
  canvas?: { width: number; height: number },
): boolean {
  return TRANSFORM_PROPERTY_PATHS.some((path) =>
    canResetTransformProperty(clip, path, canvas),
  );
}

export function buildResetTransformPropertyPatch(
  clip: Clip,
  path: string,
  canvas?: { width: number; height: number },
): ClipPatch {
  const defaultValue = getDefaultTransformPropertyValue(path, canvas);
  const keyframes = (clip.keyframes ?? []).filter((kf) => kf.property !== path);
  return {
    ...buildPatchFromPropertyPath(path, defaultValue),
    keyframes,
  };
}

export function buildResetAllTransformPatch(
  clip: Clip,
  canvas?: { width: number; height: number },
): ClipPatch {
  const defaults = ensureTransform(undefined, canvas);
  const transformPaths = new Set(TRANSFORM_PROPERTY_PATHS);
  const keyframes = (clip.keyframes ?? []).filter(
    (kf) => !transformPaths.has(kf.property),
  );
  return {
    transform: {
      position: { ...defaults.position },
      scale: defaults.scale,
      rotation: defaults.rotation,
      opacity: defaults.opacity,
    },
    keyframes,
  };
}
