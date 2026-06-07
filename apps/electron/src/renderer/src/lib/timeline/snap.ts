import type { Timeline } from "@/types/timeline";
import { getClipRange } from "@/lib/timeline/clipCollision";
import { getMarkerFrames } from "@/lib/timeline/markers";
import type { Clip } from "@/types/timeline";

export type SnapTargetKind =
  | "clip-start"
  | "clip-end"
  | "playhead"
  | "grid"
  | "marker";

export interface SnapTarget {
  frame: number;
  kind: SnapTargetKind;
}

export const DEFAULT_SNAP_THRESHOLD_PX = 10;

/** 修剪图层：吸附范围更小，避免「吸死」 */
export const RESIZE_SNAP_THRESHOLD_PX = 5;

function forEachTimelineClip(
  timeline: Timeline,
  visitor: (clip: Clip) => void,
  excludeClipId?: string,
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

export function collectSnapTargets(
  timeline: Timeline,
  options: {
    currentFrame: number;
    excludeClipId?: string;
    gridInterval?: number;
    markers?: number[];
  },
): SnapTarget[] {
  const targets: SnapTarget[] = [];
  const gridInterval = options.gridInterval ?? 1;

  targets.push({ frame: options.currentFrame, kind: "playhead" });

  for (let frame = 0; frame <= timeline.durationInFrames; frame += gridInterval) {
    targets.push({ frame, kind: "grid" });
  }

  const markerFrames = options.markers ?? getMarkerFrames(timeline);
  for (const marker of markerFrames) {
    if (marker >= 0 && marker <= timeline.durationInFrames) {
      targets.push({ frame: marker, kind: "marker" });
    }
  }

  forEachTimelineClip(timeline, (clip) => {
    const range = getClipRange(clip);
    targets.push({ frame: range.start, kind: "clip-start" });
    targets.push({ frame: range.end, kind: "clip-end" });
  }, options.excludeClipId);

  return targets;
}

export function findNearestSnap(
  frame: number,
  targets: SnapTarget[],
  thresholdFrames: number,
): { frame: number; target: SnapTarget } | null {
  let best: { frame: number; target: SnapTarget; distance: number } | null = null;

  for (const target of targets) {
    const distance = Math.abs(target.frame - frame);
    if (distance > thresholdFrames) continue;
    if (!best || distance < best.distance) {
      best = { frame: target.frame, target, distance };
    }
  }

  return best ? { frame: best.frame, target: best.target } : null;
}

export function snapFrame(
  frame: number,
  timeline: Timeline,
  options: {
    enabled: boolean;
    currentFrame: number;
    pxPerFrame: number;
    thresholdPx?: number;
    excludeClipId?: string;
    gridInterval?: number;
  },
): number {
  if (!options.enabled) return frame;

  const thresholdFrames = Math.max(
    1,
    Math.round((options.thresholdPx ?? DEFAULT_SNAP_THRESHOLD_PX) / options.pxPerFrame),
  );

  const targets = collectSnapTargets(timeline, {
    currentFrame: options.currentFrame,
    excludeClipId: options.excludeClipId,
    gridInterval: options.gridInterval,
  });

  const hit = findNearestSnap(frame, targets, thresholdFrames);
  return hit?.frame ?? frame;
}
