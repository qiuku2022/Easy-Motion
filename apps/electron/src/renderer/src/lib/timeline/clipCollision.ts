import type { Clip, Timeline, Track } from "@/types/timeline";
import { findLayerTrackForClip } from "@/lib/timeline/trackTree";

export interface ClipRange {
  start: number;
  end: number;
}

export function getClipRange(clip: Clip): ClipRange {
  return {
    start: clip.startInFrames,
    end: clip.startInFrames + clip.durationInFrames,
  };
}

export function rangesOverlap(a: ClipRange, b: ClipRange): boolean {
  return a.start < b.end && b.start < a.end;
}

export function clipsOverlap(a: Clip, b: Clip): boolean {
  return rangesOverlap(getClipRange(a), getClipRange(b));
}

/** 同轨道内是否与其它片段重叠（可排除正在拖动的片段） */
export function hasOverlapOnTrack(
  track: Track,
  candidate: ClipRange,
  excludeClipId?: string,
): boolean {
  for (const clip of track.clips) {
    if (excludeClipId && clip.id === excludeClipId) continue;
    if (rangesOverlap(candidate, getClipRange(clip))) return true;
  }
  return false;
}

export function findClipTrack(
  timeline: Timeline,
  clipId: string,
): { track: Track; clip: Clip; trackIndex: number } | null {
  const located = findLayerTrackForClip(timeline, clipId);
  if (!located) return null;
  const trackIndex = timeline.tracks.findIndex((t) => t.id === located.layerTrack.id);
  return {
    track: located.clipTrack,
    clip: located.clip,
    trackIndex: trackIndex >= 0 ? trackIndex : 0,
  };
}

export function clampClipStart(
  startInFrames: number,
  durationInFrames: number,
  durationInFramesTotal: number,
): number {
  const maxStart = Math.max(0, durationInFramesTotal - durationInFrames);
  return Math.min(maxStart, Math.max(0, startInFrames));
}

export function clampClipDuration(
  durationInFrames: number,
  startInFrames: number,
  durationInFramesTotal: number,
): number {
  const maxDuration = durationInFramesTotal - startInFrames;
  return Math.min(maxDuration, Math.max(1, durationInFrames));
}

/** 移动片段：起点 ∈ [0, timelineDuration - duration] */
export function clampMoveStart(
  startInFrames: number,
  durationInFrames: number,
  timelineDuration: number,
): number {
  const duration = Math.max(1, Math.round(durationInFrames));
  const maxStart = Math.max(0, timelineDuration - duration);
  return Math.min(maxStart, Math.max(0, Math.round(startInFrames)));
}

/** 修剪左缘：终点固定，起点 ≥ 0 且 ≤ end - 1 */
export function clampResizeLeft(
  startInFrames: number,
  fixedEndFrame: number,
  timelineDuration: number,
): { startInFrames: number; durationInFrames: number } {
  const end = Math.min(Math.round(fixedEndFrame), timelineDuration);
  let start = Math.max(0, Math.round(startInFrames));
  start = Math.min(start, end - 1);
  const duration = Math.max(1, end - start);
  return { startInFrames: start, durationInFrames: duration };
}

/** 修剪右缘：起点固定，终点 ≤ timelineDuration */
export function clampResizeRight(
  fixedStartFrame: number,
  endFrame: number,
  timelineDuration: number,
): { startInFrames: number; durationInFrames: number } {
  const start = Math.min(
    Math.max(0, Math.round(fixedStartFrame)),
    Math.max(0, timelineDuration - 1),
  );
  let end = Math.round(endFrame);
  end = Math.min(timelineDuration, Math.max(start + 1, end));
  const duration = end - start;
  return { startInFrames: start, durationInFrames: duration };
}
