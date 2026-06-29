import type { Keyframe, KeyframeBezierCp } from "@/types/timeline";
import {
  bezierCpToTemporalEases,
  clampInfluence,
  temporalEasesToBezierCp,
  type KeyframeTemporalEase,
} from "@/lib/timeline/graph-editor/temporalEase";

export type SpeedHandleSide = "incoming" | "outgoing";

export interface SpeedHandle {
  side: SpeedHandleSide;
  /** clip-local 帧 */
  frame: number;
  /** 速度（非归一化，属性单位/秒） */
  speed: number;
  /** 关联段尾关键帧 id（bezierCp 存于此帧） */
  segmentEndId: string;
}

export function speedHandlesForKeyframe(
  prev: Keyframe | null,
  kf: Keyframe,
  next: Keyframe | null,
  fps: number,
): { incoming?: SpeedHandle; outgoing?: SpeedHandle } | null {
  const handles: { incoming?: SpeedHandle; outgoing?: SpeedHandle } = {};

  if (prev && kf.interpolation === "bezier") {
    const { incoming } = bezierCpToTemporalEases(prev, kf, fps);
    const span = kf.frame - prev.frame;
    handles.incoming = {
      side: "incoming",
      frame: kf.frame - (incoming.influence / 100) * span,
      speed: incoming.speed,
      segmentEndId: kf.id,
    };
  }

  if (next && next.interpolation === "bezier") {
    const { outgoing } = bezierCpToTemporalEases(kf, next, fps);
    const span = next.frame - kf.frame;
    handles.outgoing = {
      side: "outgoing",
      frame: kf.frame + (outgoing.influence / 100) * span,
      speed: outgoing.speed,
      segmentEndId: next.id,
    };
  }

  return handles.incoming || handles.outgoing ? handles : null;
}

/** 速度图屏幕坐标：水平 influence 臂 + 可选 speed 竖向偏移 */
export function speedHandleDisplay(
  handle: SpeedHandle,
  frameToX: (frame: number) => number,
  speedToY: (speed: number) => number,
  anchorY: number,
): { influenceX: number; dotY: number } {
  const influenceX = frameToX(handle.frame);
  const rawDotY = speedToY(handle.speed);
  const dotY = Math.abs(rawDotY - anchorY) < 2 ? anchorY : rawDotY;
  return { influenceX, dotY };
}

/** 指针水平位移 → influence（速度图手柄只沿时间轴伸缩） */
export function pointerInfluenceFromFrame(
  keyframeFrame: number,
  neighborFrame: number,
  pointerFrame: number,
  side: SpeedHandleSide,
): number {
  const span = Math.abs(keyframeFrame - neighborFrame);
  if (span <= 0) return MIN_INFLUENCE_FALLBACK;

  let clamped = pointerFrame;
  if (side === "incoming") {
    const lo = Math.min(keyframeFrame, neighborFrame);
    clamped = Math.max(lo, Math.min(keyframeFrame, pointerFrame));
  } else {
    const hi = Math.max(keyframeFrame, neighborFrame);
    clamped = Math.max(keyframeFrame, Math.min(hi, pointerFrame));
  }

  return clampInfluence((Math.abs(clamped - keyframeFrame) / span) * 100);
}

/** 指针位置 → temporal ease（拖拽反算） */
export function pointerToTemporalEase(
  keyframeFrame: number,
  neighborFrame: number,
  pointerFrame: number,
  pointerSpeed: number,
  side: SpeedHandleSide,
): KeyframeTemporalEase {
  return {
    speed: pointerSpeed,
    influence: pointerInfluenceFromFrame(
      keyframeFrame,
      neighborFrame,
      pointerFrame,
      side,
    ),
  };
}

const MIN_INFLUENCE_FALLBACK = 0.1;

/** 更新入向手柄 → 新 bezierCp（段 prev → end） */
export function patchIncomingHandle(
  prev: Keyframe,
  end: Keyframe,
  incoming: KeyframeTemporalEase,
  fps: number,
): KeyframeBezierCp {
  const { outgoing } = bezierCpToTemporalEases(prev, end, fps);
  return temporalEasesToBezierCp(prev, end, outgoing, incoming, fps);
}

/** 更新出向手柄 → 新 bezierCp（段 kf → next） */
export function patchOutgoingHandle(
  kf: Keyframe,
  next: Keyframe,
  outgoing: KeyframeTemporalEase,
  fps: number,
): KeyframeBezierCp {
  const { incoming } = bezierCpToTemporalEases(kf, next, fps);
  return temporalEasesToBezierCp(kf, next, outgoing, incoming, fps);
}
