import { getMarkerFrames } from "@/lib/timeline/markers";
import type { Timeline } from "@/types/timeline";

/** 时间线上所有剪辑点（片段入点 / 出点、标记点、首尾帧） */
export function collectEditPoints(timeline: Timeline): number[] {
  const points = new Set<number>([0, Math.max(0, timeline.durationInFrames - 1)]);

  for (const frame of getMarkerFrames(timeline)) {
    points.add(frame);
  }

  for (const track of timeline.tracks) {
    for (const clip of track.clips) {
      points.add(clip.startInFrames);
      points.add(clip.startInFrames + clip.durationInFrames);
    }
    for (const child of track.children ?? []) {
      for (const clip of child.clips) {
        points.add(clip.startInFrames);
        points.add(clip.startInFrames + clip.durationInFrames);
      }
    }
  }

  return [...points].sort((a, b) => a - b);
}

export function seekPrevEditPoint(currentFrame: number, points: number[]): number {
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i]! < currentFrame) return points[i]!;
  }
  return points[0] ?? 0;
}

export function seekNextEditPoint(currentFrame: number, points: number[]): number {
  for (const point of points) {
    if (point > currentFrame) return point;
  }
  return points[points.length - 1] ?? currentFrame;
}
