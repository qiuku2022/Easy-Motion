import type { Keyframe, KeyframeBezierCp, KeyframeSpringConfig } from "@/types/timeline";

export const DEFAULT_BEZIER_CP: KeyframeBezierCp = {
  x1: 0.42,
  y1: 0,
  x2: 0.58,
  y2: 1,
};

export const DEFAULT_SPRING_CONFIG: KeyframeSpringConfig = {
  damping: 12,
  stiffness: 120,
  mass: 1,
};

/** CSS cubic-bezier easing: map normalized time t ∈ [0,1] to eased progress. */
export function cubicBezierEase(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t: number,
): number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (u: number) => ((ax * u + bx) * u + cx) * u;
  const sampleY = (u: number) => ((ay * u + by) * u + cy) * u;

  const target = Math.max(0, Math.min(1, t));
  let low = 0;
  let high = 1;
  for (let i = 0; i < 14; i += 1) {
    const mid = (low + high) / 2;
    if (sampleX(mid) < target) low = mid;
    else high = mid;
  }
  const u = (low + high) / 2;
  return sampleY(u);
}

/** dy/dt for CSS cubic-bezier easing at normalized time t ∈ [0,1]. */
export function cubicBezierEaseDerivative(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t: number,
): number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (u: number) => ((ax * u + bx) * u + cx) * u;
  const derivX = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
  const derivY = (u: number) => (3 * ay * u + 2 * by) * u + cy;

  const target = Math.max(0, Math.min(1, t));
  let low = 0;
  let high = 1;
  for (let i = 0; i < 14; i += 1) {
    const mid = (low + high) / 2;
    if (sampleX(mid) < target) low = mid;
    else high = mid;
  }
  const u = (low + high) / 2;
  const dx = derivX(u);
  const dy = derivY(u);
  return Math.abs(dx) > 1e-9 ? dy / dx : 0;
}

function applyNamedEasing(name: string | undefined, t: number): number {
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
    case "linear":
    default:
      return clamped;
  }
}

/** d(progress)/dt for named easing at t ∈ [0,1]. */
export function namedEasingDerivative(name: string | undefined, t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  switch (name) {
    case "ease-in":
      return 2 * clamped;
    case "ease-out":
      return 2 - 2 * clamped;
    case "ease-in-out":
      return clamped < 0.5 ? 4 * clamped : 4 - 4 * clamped;
    case "linear":
    default:
      return 1;
  }
}

/**
 * Approximate Remotion `spring()` progress for UI curve preview (0→1).
 * Segment length in frames scales oscillation settle time.
 */
export function springProgress(
  localFrame: number,
  durationInFrames: number,
  config: KeyframeSpringConfig,
  fps: number,
): number {
  const mass = config.mass ?? 1;
  const damping = config.damping ?? 12;
  const stiffness = config.stiffness ?? 120;
  const duration = Math.max(1, durationInFrames);
  const t = Math.max(0, Math.min(1, localFrame / duration));
  const omega0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));

  if (zeta >= 1) {
    const decay = Math.exp(-omega0 * t * 3);
    return 1 - decay;
  }

  const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
  const envelope = Math.exp(-zeta * omega0 * t);
  const angle = omegaD * t * Math.PI * 2 * (duration / Math.max(fps, 1));
  const oscillation = Math.cos(angle);
  return 1 - envelope * (1 - oscillation) * 0.5 - envelope * 0.5;
}

export function resolveBezierCp(kf?: Keyframe | null): KeyframeBezierCp {
  return kf?.bezierCp ?? DEFAULT_BEZIER_CP;
}

export function resolveSpringConfig(kf?: Keyframe | null): KeyframeSpringConfig {
  return { ...DEFAULT_SPRING_CONFIG, ...(kf?.springConfig ?? {}) };
}

export function applySegmentEasing(
  rawT: number,
  end: Keyframe,
  segmentFrames: number,
  localFrame: number,
  fps: number,
): number {
  if (end.easing === "spring") {
    return springProgress(localFrame, segmentFrames, resolveSpringConfig(end), fps);
  }

  if (end.interpolation === "bezier") {
    const cp = resolveBezierCp(end);
    return cubicBezierEase(cp.x1, cp.y1, cp.x2, cp.y2, rawT);
  }

  return applyNamedEasing(end.easing, rawT);
}

/** Sample eased curve for SVG path (value 0–1 over time 0–1). */
export function sampleEasingCurve(
  end: Keyframe,
  segmentFrames: number,
  fps: number,
  steps = 24,
): Array<{ t: number; y: number }> {
  const points: Array<{ t: number; y: number }> = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const localFrame = t * segmentFrames;
    const y = applySegmentEasing(t, end, segmentFrames, localFrame, fps);
    points.push({ t, y });
  }
  return points;
}
