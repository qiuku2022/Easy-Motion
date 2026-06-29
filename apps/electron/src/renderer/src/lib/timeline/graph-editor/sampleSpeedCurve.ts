import type { Keyframe } from "@/types/timeline";
import {
  applySegmentEasing,
  cubicBezierEaseDerivative,
  namedEasingDerivative,
  resolveBezierCp,
} from "@/lib/timeline/keyframeEasing";

export interface SpeedSample {
  /** 段内归一化时间 0–1 */
  t: number;
  /** 变化率（属性单位/秒） */
  speed: number;
}

/** 段内归一化时间 t 处的速度（属性单位/秒） */
export function segmentSpeedAtT(
  prev: Keyframe,
  end: Keyframe,
  t: number,
  fps: number,
): number {
  const segmentFrames = end.frame - prev.frame;
  if (segmentFrames <= 0) return 0;

  const v0 = Number(prev.value);
  const v1 = Number(end.value);
  if (Number.isNaN(v0) || Number.isNaN(v1)) return 0;

  const deltaV = v1 - v0;
  const dt = segmentFrames / fps;
  if (dt <= 0) return 0;

  const clamped = Math.max(0, Math.min(1, t));
  let dProgress = 0;

  if (end.easing === "spring") {
    const eps = 1 / 512;
    const t0 = Math.max(0, clamped - eps);
    const t1 = Math.min(1, clamped + eps);
    const e0 = applySegmentEasing(t0, end, segmentFrames, t0 * segmentFrames, fps);
    const e1 = applySegmentEasing(t1, end, segmentFrames, t1 * segmentFrames, fps);
    dProgress = (e1 - e0) / (t1 - t0 || eps * 2);
  } else if (end.interpolation === "bezier") {
    const cp = resolveBezierCp(end);
    dProgress = cubicBezierEaseDerivative(cp.x1, cp.y1, cp.x2, cp.y2, clamped);
  } else {
    dProgress = namedEasingDerivative(end.easing, clamped);
  }

  return (dProgress * deltaV) / dt;
}

/** 采样段 (prev → end) 的速度曲线，用于速度图绘制 */
export function sampleSpeedCurve(
  prev: Keyframe,
  end: Keyframe,
  fps: number,
  steps = 48,
): SpeedSample[] {
  const segmentFrames = end.frame - prev.frame;
  if (segmentFrames <= 0) return [];

  const points: SpeedSample[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    points.push({ t, speed: segmentSpeedAtT(prev, end, t, fps) });
  }
  return points;
}

/** 按段像素宽度自适应采样密度（约每 1px 一个点） */
export function speedSampleStepsForWidth(segmentPx: number): number {
  return Math.max(64, Math.min(256, Math.ceil(segmentPx)));
}

/** 速度采样点 → SVG path（折线密采样 ≈ 平滑曲线） */
export function speedSamplesToSvgPath(
  samples: SpeedSample[],
  prevFrame: number,
  segFrames: number,
  pxPerFrame: number,
  graphHeight: number,
  speedMin: number,
  speedMax: number,
): string {
  if (samples.length === 0 || segFrames <= 0) return "";
  const span = speedMax - speedMin || 1;
  return samples
    .map((s, index) => {
      const frame = prevFrame + s.t * segFrames;
      const x = frame * pxPerFrame;
      const y = graphHeight - ((s.speed - speedMin) / span) * graphHeight;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

/** 关键帧处的速度（贴在曲线上的点） */
export function speedAtKeyframe(
  keyframes: Keyframe[],
  index: number,
  fps: number,
): number {
  if (index > 0) {
    return segmentSpeedAtT(keyframes[index - 1]!, keyframes[index]!, 1, fps);
  }
  if (index < keyframes.length - 1) {
    return segmentSpeedAtT(keyframes[index]!, keyframes[index + 1]!, 0, fps);
  }
  return 0;
}

/**
 * 速度图 Y 轴范围：0 为语义基线（AE 风格），负速度保留在基线以下。
 */
export function speedRangeForSegments(
  keyframes: Keyframe[],
  fps: number,
): { min: number; max: number } {
  if (keyframes.length < 2) return { min: 0, max: 1 };

  let dataMin = Infinity;
  let dataMax = -Infinity;
  for (let i = 0; i < keyframes.length - 1; i += 1) {
    const samples = sampleSpeedCurve(keyframes[i]!, keyframes[i + 1]!, fps);
    for (const s of samples) {
      dataMin = Math.min(dataMin, s.speed);
      dataMax = Math.max(dataMax, s.speed);
    }
  }
  if (!Number.isFinite(dataMin) || !Number.isFinite(dataMax)) {
    return { min: 0, max: 1 };
  }

  const min = Math.min(0, dataMin);
  const max = Math.max(0, dataMax);
  const span = max - min;
  if (span < 1e-6) return { min: 0, max: 1 };
  const pad = span * 0.1;
  return { min: min - (min < 0 ? pad : 0), max: max + pad };
}
