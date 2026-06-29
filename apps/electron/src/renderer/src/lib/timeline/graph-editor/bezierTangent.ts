import type { Keyframe, KeyframeBezierCp } from "@/types/timeline";
import { DEFAULT_BEZIER_CP } from "@/lib/timeline/keyframeEasing";
import { clamp01 } from "@/lib/timeline/graph-editor/temporalEase";

export interface ValueHandle {
  side: "incoming" | "outgoing";
  frame: number;
  value: number;
  segmentEndId: string;
}

/** 值图空间贝塞尔控制点（段 prev → end） */
export function valueHandlesForSegment(
  prev: Keyframe,
  end: Keyframe,
): { incoming: ValueHandle; outgoing: ValueHandle } | null {
  if (end.interpolation !== "bezier") return null;

  const v0 = Number(prev.value);
  const v1 = Number(end.value);
  if (Number.isNaN(v0) || Number.isNaN(v1)) return null;

  const span = end.frame - prev.frame;
  const deltaV = v1 - v0;
  const cp = end.bezierCp ?? DEFAULT_BEZIER_CP;

  return {
    outgoing: {
      side: "outgoing",
      frame: prev.frame + cp.x1 * span,
      value: v0 + cp.y1 * deltaV,
      segmentEndId: end.id,
    },
    incoming: {
      side: "incoming",
      frame: prev.frame + cp.x2 * span,
      value: v0 + cp.y2 * deltaV,
      segmentEndId: end.id,
    },
  };
}

export function valueHandlesForKeyframe(
  prev: Keyframe | null,
  kf: Keyframe,
  next: Keyframe | null,
): { incoming?: ValueHandle; outgoing?: ValueHandle } | null {
  const handles: { incoming?: ValueHandle; outgoing?: ValueHandle } = {};

  if (prev) {
    const seg = valueHandlesForSegment(prev, kf);
    if (seg) handles.incoming = seg.incoming;
  }
  if (next) {
    const seg = valueHandlesForSegment(kf, next);
    if (seg) handles.outgoing = seg.outgoing;
  }

  return handles.incoming || handles.outgoing ? handles : null;
}

export function patchValueHandle(
  prev: Keyframe,
  end: Keyframe,
  side: "incoming" | "outgoing",
  frame: number,
  value: number,
): KeyframeBezierCp {
  const v0 = Number(prev.value);
  const v1 = Number(end.value);
  const span = Math.max(1, end.frame - prev.frame);
  const deltaV = v1 - v0 || 1;
  const cp = end.bezierCp ?? DEFAULT_BEZIER_CP;

  if (side === "outgoing") {
    return {
      ...cp,
      x1: clamp01((frame - prev.frame) / span),
      y1: clamp01((value - v0) / deltaV),
    };
  }
  return {
    ...cp,
    x2: clamp01((frame - prev.frame) / span),
    y2: clamp01((value - v0) / deltaV),
  };
}
