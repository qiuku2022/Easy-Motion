import type { Keyframe, KeyframeBezierCp } from "@/types/timeline";
import { DEFAULT_BEZIER_CP } from "@/lib/timeline/keyframeEasing";

export interface KeyframeTemporalEase {
  /** 进入/离开关键帧的速度（单位/秒，随属性维度） */
  speed: number;
  /** 影响百分比，AE 官方范围 [0.1, 100] */
  influence: number;
}

export const MIN_INFLUENCE = 0.1;
export const MAX_INFLUENCE = 100;

/** AE Easy Ease (F9) 默认：入出 speed=0，influence=33.33% */
export const AE_EASY_EASE: KeyframeTemporalEase = {
  speed: 0,
  influence: 33.33,
};

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function clampInfluence(v: number): number {
  return Math.max(MIN_INFLUENCE, Math.min(MAX_INFLUENCE, v));
}

export function averageSpeed(prev: Keyframe, end: Keyframe, fps: number): number {
  const v0 = Number(prev.value);
  const v1 = Number(end.value);
  const deltaF = end.frame - prev.frame;
  if (deltaF <= 0 || Number.isNaN(v0) || Number.isNaN(v1)) return 0;
  return Math.abs(v1 - v0) / (deltaF / fps);
}

/** 段 (prev → end) 的 AE temporal ease → 段尾关键帧 bezierCp */
export function temporalEasesToBezierCp(
  prev: Keyframe,
  end: Keyframe,
  outgoing: KeyframeTemporalEase,
  incoming: KeyframeTemporalEase,
  fps: number,
): KeyframeBezierCp {
  const avg = averageSpeed(prev, end, fps);
  const outInf = clampInfluence(outgoing.influence) / 100;
  const x1 = outInf;
  const y1 = avg > 0 ? (outgoing.speed / avg) * x1 : 0;

  const inInf = clampInfluence(incoming.influence) / 100;
  const x2 = 1 - inInf;
  const y2 = avg > 0 ? 1 - (incoming.speed / avg) * inInf : 1;

  return {
    x1: clamp01(x1),
    y1: clamp01(y1),
    x2: clamp01(x2),
    y2: clamp01(y2),
  };
}

/** 段尾 bezierCp → AE temporal ease（prev 的 outgoing + end 的 incoming） */
export function bezierCpToTemporalEases(
  prev: Keyframe,
  end: Keyframe,
  fps: number,
): { outgoing: KeyframeTemporalEase; incoming: KeyframeTemporalEase } {
  const cp = end.bezierCp ?? DEFAULT_BEZIER_CP;
  const avg = averageSpeed(prev, end, fps);

  const outInfluence = cp.x1 * 100;
  const outSpeed = cp.x1 > 1e-6 ? (cp.y1 / cp.x1) * avg : 0;

  const inInfluence = (1 - cp.x2) * 100;
  const inInfNorm = inInfluence / 100;
  const inSpeed =
    inInfNorm > 1e-6 ? ((1 - cp.y2) / inInfNorm) * avg : 0;

  return {
    outgoing: {
      speed: outSpeed,
      influence: clampInfluence(outInfluence),
    },
    incoming: {
      speed: inSpeed,
      influence: clampInfluence(inInfluence),
    },
  };
}

/** AE Easy Ease → bezierCp（段 prev → end） */
export function easyEaseBezierCp(
  prev: Keyframe,
  end: Keyframe,
  fps: number,
): KeyframeBezierCp {
  return temporalEasesToBezierCp(prev, end, AE_EASY_EASE, AE_EASY_EASE, fps);
}
