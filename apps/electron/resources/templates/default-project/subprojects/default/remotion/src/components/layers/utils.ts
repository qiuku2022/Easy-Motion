import { Easing, interpolate, spring } from 'remotion';

// ─── Types ───────────────────────────────────────────────────────────────────

export type EasingName = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring';
export type InterpolationType = 'linear' | 'bezier' | 'hold';
export type AnimationType = 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right';

export interface Keyframe {
  frame: number;
  property: string;
  value: number;
  easing?: EasingName;
  interpolation?: InterpolationType;
}

export interface AnimationConfig {
  type: AnimationType;
  duration: number;
  easing?: EasingName;
}

export interface Transform {
  position: { x: number; y: number };
  scale: number;
  rotation: number;
  opacity: number;
}

export interface TextStyle {
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  letterSpacing?: number;
  fontWeight?: number | string;
  textShadow?: string;
}

export interface ImageStyle {
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  borderRadius?: number;
  filter?: string;
}

export interface ShapeStyle {
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  shapeType?: 'rect' | 'circle';
  width?: number;
  height?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SLIDE_OFFSET = 100;

/**
 * Standard CSS ease curve (cubic-bezier(0.25, 0.1, 0.25, 1.0)).
 * Used as the base for ease-in / ease-out / ease-in-out mappings because
 * Remotion's Easing module does not expose a standalone `Easing.ease` member.
 */
const EASE_FN = Easing.bezier(0.25, 0.1, 0.25, 1.0);

// ─── Easing Map ──────────────────────────────────────────────────────────────

export const easingMap: Record<string, (t: number) => number> = {
  linear: Easing.linear,
  'ease-in': Easing.in(EASE_FN),
  'ease-out': Easing.out(EASE_FN),
  'ease-in-out': Easing.inOut(EASE_FN),
};

// ─── applyKeyframes ───────────────────────────────────────────────────────────

/**
 * Interpolate a numeric value for the given frame using keyframes.
 *
 * Filters keyframes by `property`, finds the two surrounding keyframes,
 * and interpolates between them using the easing/interpolation mode
 * specified on the *to* keyframe.
 *
 * - No matching keyframes  → returns `defaultValue`
 * - One matching keyframe  → returns that keyframe's value
 * - `hold` interpolation   → returns the *from* keyframe's value (step function)
 * - `spring` easing        → uses Remotion's `spring()` for progress
 * - `linear` interpolation → linear curve, ignores easing field
 * - `bezier` interpolation → applies the easing curve from `easingMap`
 */
export function applyKeyframes(
  frame: number,
  keyframes: Keyframe[],
  property: string,
  defaultValue: number,
  fps: number,
): number {
  const relevant = keyframes
    .filter((kf) => kf.property === property)
    .sort((a, b) => a.frame - b.frame);

  if (relevant.length === 0) return defaultValue;
  if (relevant.length === 1) return relevant[0].value;
  if (frame <= relevant[0].frame) return relevant[0].value;
  if (frame >= relevant[relevant.length - 1].frame) {
    return relevant[relevant.length - 1].value;
  }

  // Find the two surrounding keyframes
  let fromKf = relevant[0];
  let toKf = relevant[1];
  for (let i = 1; i < relevant.length; i++) {
    if (relevant[i].frame >= frame) {
      toKf = relevant[i];
      fromKf = relevant[i - 1];
      break;
    }
  }

  // Guard against zero-duration segments
  if (fromKf.frame === toKf.frame) return toKf.value;

  const interpolationType: InterpolationType = toKf.interpolation ?? 'bezier';
  const easingName: EasingName = toKf.easing ?? 'linear';

  // Step function — hold previous value until the next keyframe
  if (interpolationType === 'hold') {
    return fromKf.value;
  }

  // Spring easing uses Remotion's spring() directly
  if (easingName === 'spring') {
    const localFrame = frame - fromKf.frame;
    const progress = spring({
      frame: localFrame,
      fps,
      config: { damping: 12, stiffness: 100 },
    });
    return fromKf.value + (toKf.value - fromKf.value) * progress;
  }

  // Choose easing function
  const easingFn =
    interpolationType === 'linear'
      ? Easing.linear
      : (easingMap[easingName] ?? Easing.linear);

  return interpolate(frame, [fromKf.frame, toKf.frame], [fromKf.value, toKf.value], {
    easing: easingFn,
  });
}

// ─── applyAnimation ──────────────────────────────────────────────────────────

export interface AnimationModifiers {
  opacityMultiplier: number;
  translateX: number;
  translateY: number;
}

const IDENTITY: AnimationModifiers = {
  opacityMultiplier: 1,
  translateX: 0,
  translateY: 0,
};

/**
 * Compute animation modifiers (opacity multiplier + translation offsets)
 * for entrance (`'in'`) or exit (`'out'`) animations.
 *
 * Returns identity modifiers when `animation` is undefined or the current
 * frame is outside the animation window.
 */
export function applyAnimation(
  frame: number,
  durationInFrames: number,
  animation: AnimationConfig | undefined,
  direction: 'in' | 'out',
): AnimationModifiers {
  if (!animation) return IDENTITY;

  const { type: animType, duration, easing: easingName } = animation;
  const easingFn = easingName ? (easingMap[easingName] ?? Easing.linear) : Easing.linear;

  if (direction === 'in') {
    if (frame >= duration) return IDENTITY;

    const progress = interpolate(frame, [0, duration], [0, 1], {
      easing: easingFn,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

    switch (animType) {
      case 'fade':
        return { opacityMultiplier: progress, translateX: 0, translateY: 0 };
      case 'slide-up':
        return {
          opacityMultiplier: progress,
          translateX: 0,
          translateY: interpolate(progress, [0, 1], [SLIDE_OFFSET, 0]),
        };
      case 'slide-down':
        return {
          opacityMultiplier: progress,
          translateX: 0,
          translateY: interpolate(progress, [0, 1], [-SLIDE_OFFSET, 0]),
        };
      case 'slide-left':
        return {
          opacityMultiplier: progress,
          translateX: interpolate(progress, [0, 1], [SLIDE_OFFSET, 0]),
          translateY: 0,
        };
      case 'slide-right':
        return {
          opacityMultiplier: progress,
          translateX: interpolate(progress, [0, 1], [-SLIDE_OFFSET, 0]),
          translateY: 0,
        };
      default:
        return IDENTITY;
    }
  }

  // Out animation
  const startFrame = durationInFrames - duration;
  if (frame < startFrame) return IDENTITY;

  const progress = interpolate(frame, [startFrame, durationInFrames], [1, 0], {
    easing: easingFn,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  switch (animType) {
    case 'fade':
      return { opacityMultiplier: progress, translateX: 0, translateY: 0 };
    case 'slide-up':
      return {
        opacityMultiplier: progress,
        translateX: 0,
        translateY: interpolate(progress, [0, 1], [-SLIDE_OFFSET, 0]),
      };
    case 'slide-down':
      return {
        opacityMultiplier: progress,
        translateX: 0,
        translateY: interpolate(progress, [0, 1], [SLIDE_OFFSET, 0]),
      };
    case 'slide-left':
      return {
        opacityMultiplier: progress,
        translateX: interpolate(progress, [0, 1], [-SLIDE_OFFSET, 0]),
        translateY: 0,
      };
    case 'slide-right':
      return {
        opacityMultiplier: progress,
        translateX: interpolate(progress, [0, 1], [SLIDE_OFFSET, 0]),
        translateY: 0,
      };
    default:
      return IDENTITY;
  }
}

// ─── Path Utilities ───────────────────────────────────────────────────────────

/**
 * Recursively access a nested property by dot-separated path.
 * getValueByPath({ a: { b: 1 } }, 'a.b') → 1
 */
export function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Recursively set a nested property by dot-separated path, returning a new object.
 * setValueByPath({ a: { b: 1 } }, 'a.b', 2) → { a: { b: 2 } }
 */
export function setValueByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const keys = path.split('.');
  const result: Record<string, unknown> = { ...obj };
  let current: Record<string, unknown> = result;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const existing = current[key];
    if (existing === undefined || existing === null || typeof existing !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
  return result;
}