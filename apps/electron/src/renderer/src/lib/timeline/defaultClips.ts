import type { Clip, Timeline } from "@/types/timeline";

export function createDefaultTextClip(timeline: Timeline): Clip {
  const cx = Math.round(timeline.width / 2);
  const cy = Math.round(timeline.height / 2);
  const duration = Math.min(60, timeline.durationInFrames);
  return {
    id: `clip-${crypto.randomUUID()}`,
    type: "text",
    name: "文字",
    startInFrames: 0,
    durationInFrames: Math.max(1, duration),
    source: { kind: "inline", content: "文字" },
    transform: {
      position: { x: cx, y: cy },
      scale: 1,
      rotation: 0,
      opacity: 1,
    },
    style: {
      fontFamily: "Inter, sans-serif",
      fontSize: 48,
      color: "#f8fafc",
      textAlign: "center",
    },
    keyframes: [],
    lastModifiedBy: "user",
  };
}

export function createDefaultShapeClip(timeline: Timeline): Clip {
  const duration = Math.min(60, timeline.durationInFrames);
  return {
    id: `clip-${crypto.randomUUID()}`,
    type: "shape",
    name: "形状",
    startInFrames: 0,
    durationInFrames: Math.max(1, duration),
    source: {
      kind: "inline",
      shape: "rect",
      width: Math.round(timeline.width * 0.6),
      height: Math.round(timeline.height * 0.2),
    },
    transform: {
      position: { x: Math.round(timeline.width / 2), y: Math.round(timeline.height / 2) },
      scale: 1,
      rotation: 0,
      opacity: 1,
    },
    style: {
      fillColor: "#2d3748",
    },
    keyframes: [],
    lastModifiedBy: "user",
  };
}

const CONTENT_TRACK_TYPES = ["text", "shape"] as const;

export function defaultClipForTrackType(
  timeline: Timeline,
  type: (typeof CONTENT_TRACK_TYPES)[number],
): Clip {
  if (type === "shape") return createDefaultShapeClip(timeline);
  return createDefaultTextClip(timeline);
}

export function trackTypeNeedsDefaultClip(type: string): type is (typeof CONTENT_TRACK_TYPES)[number] {
  return (CONTENT_TRACK_TYPES as readonly string[]).includes(type);
}
