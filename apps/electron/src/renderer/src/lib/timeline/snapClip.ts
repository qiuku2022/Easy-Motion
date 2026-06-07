import {
  clampMoveStart,
  clampResizeLeft,
  clampResizeRight,
  getClipRange,
} from "@/lib/timeline/clipCollision";
import { getMarkerFrames } from "@/lib/timeline/markers";
import {
  DEFAULT_SNAP_THRESHOLD_PX,
  RESIZE_SNAP_THRESHOLD_PX,
} from "@/lib/timeline/snap";
import type { SnapEditOptions } from "@/lib/timeline/snapEditFrame";
import type { Timeline } from "@/types/timeline";

export type ClipEdge = "start" | "end" | "center";

export interface SnapGuide {
  frame: number;
  label?: string;
}

interface ReferenceFrame {
  frame: number;
  label?: string;
}

function thresholdFrames(pxPerFrame: number, thresholdPx = DEFAULT_SNAP_THRESHOLD_PX): number {
  return Math.max(1, Math.round(thresholdPx / pxPerFrame));
}

function forEachSnapClip(
  timeline: Timeline,
  excludeClipId: string | undefined,
  visitor: (clip: { id: string; startInFrames: number; durationInFrames: number }) => void,
): void {
  for (const track of timeline.tracks) {
    for (const clip of track.clips) {
      if (excludeClipId && clip.id === excludeClipId) continue;
      visitor(clip);
    }
    for (const child of track.children ?? []) {
      for (const clip of child.clips) {
        if (excludeClipId && clip.id === excludeClipId) continue;
        visitor(clip);
      }
    }
  }
}

function collectReferenceFrames(
  timeline: Timeline,
  excludeClipId: string | undefined,
  currentFrame: number,
): ReferenceFrame[] {
  const refs: ReferenceFrame[] = [
    { frame: 0 },
    { frame: timeline.durationInFrames },
    { frame: currentFrame, label: "播放头" },
  ];

  for (const frame of getMarkerFrames(timeline)) {
    refs.push({ frame, label: "标记" });
  }

  forEachSnapClip(timeline, excludeClipId, (clip) => {
    const range = getClipRange(clip);
    const center = range.start + Math.round(clip.durationInFrames / 2);
    refs.push({ frame: range.start });
    refs.push({ frame: range.end });
    refs.push({ frame: center, label: "中心" });
  });

  return refs;
}

/** 修剪时仅参考其它图层的头、尾（每次从最新 timeline 读取） */
function collectClipHeadTailFrames(
  timeline: Timeline,
  excludeClipId: string,
): ReferenceFrame[] {
  const refs: ReferenceFrame[] = [];

  for (const frame of getMarkerFrames(timeline)) {
    refs.push({ frame, label: "标记" });
  }

  forEachSnapClip(timeline, excludeClipId, (clip) => {
    const range = getClipRange(clip);
    refs.push({ frame: range.start });
    refs.push({ frame: range.end });
  });

  return refs;
}

function findTrimGuides(
  activeEdgeFrame: number,
  refs: ReferenceFrame[],
  threshold: number,
): SnapGuide[] {
  const guides: SnapGuide[] = [];
  const seen = new Set<number>();

  for (const ref of refs) {
    if (Math.abs(activeEdgeFrame - ref.frame) > threshold) continue;
    if (seen.has(ref.frame)) continue;
    seen.add(ref.frame);
    guides.push({ frame: ref.frame });
  }

  return guides.sort((a, b) => a.frame - b.frame);
}

function clipEdges(start: number, duration: number): Record<ClipEdge, number> {
  return {
    start,
    end: start + duration,
    center: start + Math.round(duration / 2),
  };
}

function startFromEdgeSnap(edge: ClipEdge, targetFrame: number, duration: number): number {
  if (edge === "start") return targetFrame;
  if (edge === "end") return targetFrame - duration;
  return targetFrame - Math.round(duration / 2);
}

function findGuidesAtPosition(
  start: number,
  duration: number,
  refs: ReferenceFrame[],
  threshold: number,
): SnapGuide[] {
  const edges = clipEdges(start, duration);
  const guides: SnapGuide[] = [];
  const seen = new Set<number>();

  for (const ref of refs) {
    for (const edge of Object.values(edges)) {
      if (Math.abs(edge - ref.frame) <= threshold) {
        if (!seen.has(ref.frame)) {
          seen.add(ref.frame);
          guides.push({ frame: ref.frame, label: ref.label });
        }
      }
    }
  }

  return guides.sort((a, b) => a.frame - b.frame);
}

export interface SnapClipMoveResult {
  startInFrames: number;
  guides: SnapGuide[];
}

/** 移动片段：对齐左/右/中心边，返回吸附后起点与对齐线 */
export function snapClipMove(
  rawStart: number,
  duration: number,
  options: SnapEditOptions & { excludeClipId: string },
): SnapClipMoveResult {
  const start = Math.round(rawStart);
  const threshold = thresholdFrames(options.pxPerFrame);
  const refs = collectReferenceFrames(
    options.timeline,
    options.excludeClipId,
    options.currentFrame,
  );

  const showGuides = options.snapEnabled || options.altKeyHeld;
  const applySnap = options.snapEnabled && !options.altKeyHeld;

  const timelineDuration = options.timeline.durationInFrames;

  if (!showGuides) {
    return {
      startInFrames: clampMoveStart(start, duration, timelineDuration),
      guides: [],
    };
  }

  if (!applySnap) {
    const clamped = clampMoveStart(start, duration, timelineDuration);
    return {
      startInFrames: clamped,
      guides: findGuidesAtPosition(clamped, duration, refs, threshold),
    };
  }

  const edges = clipEdges(start, duration);
  let best: { edge: ClipEdge; ref: ReferenceFrame; distance: number } | null = null;

  for (const [edgeName, edgeFrame] of Object.entries(edges) as [ClipEdge, number][]) {
    for (const ref of refs) {
      const distance = Math.abs(edgeFrame - ref.frame);
      if (distance > threshold) continue;
      if (!best || distance < best.distance) {
        best = { edge: edgeName, ref, distance };
      }
    }
  }

  const snappedStart = best
    ? startFromEdgeSnap(best.edge, best.ref.frame, duration)
    : start;

  const clamped = clampMoveStart(snappedStart, duration, timelineDuration);

  return {
    startInFrames: clamped,
    guides: findGuidesAtPosition(clamped, duration, refs, threshold),
  };
}

export interface SnapClipEdgeResult {
  startInFrames: number;
  durationInFrames: number;
  guides: SnapGuide[];
}

/** 裁剪左缘 / 右缘时的边吸附 */
export function snapClipEdge(
  mode: "resize-left" | "resize-right",
  pointerFrame: number,
  originStart: number,
  originEnd: number,
  options: SnapEditOptions & { excludeClipId: string },
): SnapClipEdgeResult {
  const threshold = thresholdFrames(options.pxPerFrame, RESIZE_SNAP_THRESHOLD_PX);
  const refs = collectClipHeadTailFrames(options.timeline, options.excludeClipId);
  const showGuides = options.snapEnabled || options.altKeyHeld;
  const applySnap = options.snapEnabled && !options.altKeyHeld;
  const timelineDuration = options.timeline.durationInFrames;

  if (mode === "resize-left") {
    let start = Math.round(pointerFrame);

    if (applySnap) {
      let best: { ref: ReferenceFrame; distance: number } | null = null;
      for (const ref of refs) {
        const distance = Math.abs(start - ref.frame);
        if (distance > threshold) continue;
        if (!best || distance < best.distance) best = { ref, distance };
      }
      if (best) start = best.ref.frame;
    }

    const { startInFrames, durationInFrames } = clampResizeLeft(
      start,
      originEnd,
      timelineDuration,
    );
    const guides = showGuides
      ? findTrimGuides(startInFrames, refs, threshold)
      : [];

    return { startInFrames, durationInFrames, guides };
  }

  const start = originStart;
  let end = Math.round(pointerFrame);

  if (applySnap) {
    let best: { ref: ReferenceFrame; distance: number } | null = null;
    for (const ref of refs) {
      const distance = Math.abs(end - ref.frame);
      if (distance > threshold) continue;
      if (!best || distance < best.distance) best = { ref, distance };
    }
    if (best) end = best.ref.frame;
  }

  const { startInFrames, durationInFrames } = clampResizeRight(
    start,
    end,
    timelineDuration,
  );
  const guides = showGuides
    ? findTrimGuides(startInFrames + durationInFrames, refs, threshold)
    : [];

  return { startInFrames, durationInFrames, guides };
}
