import type { Clip, Timeline, Track } from "@/types/timeline";
import { TRACK_TYPES } from "@/types/timeline";

export class TimelineValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimelineValidationError";
  }
}

function assertClipInBounds(clip: Clip, durationInFrames: number): void {
  if (clip.durationInFrames < 1) {
    throw new TimelineValidationError(`clip ${clip.id}: duration must be >= 1`);
  }
  if (clip.startInFrames < 0) {
    throw new TimelineValidationError(`clip ${clip.id}: start must be >= 0`);
  }
  if (clip.startInFrames + clip.durationInFrames > durationInFrames) {
    throw new TimelineValidationError(`clip ${clip.id} exceeds timeline duration`);
  }
}

function assertNoOverlapOnTrack(track: Track): void {
  const sorted = [...track.clips].sort((a, b) => a.startInFrames - b.startInFrames);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev.startInFrames + prev.durationInFrames > curr.startInFrames) {
      throw new TimelineValidationError(
        `track ${track.id}: clips ${prev.id} and ${curr.id} overlap`,
      );
    }
  }
}

/** 渲染进程内校验（与 packages/shared validateTimeline 规则对齐） */
export function assertValidTimeline(timeline: Timeline): void {
  for (const key of ["fps", "durationInFrames", "width", "height"] as const) {
    const value = timeline[key];
    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new TimelineValidationError(`timeline.${key} must be a number`);
    }
  }

  if (!Array.isArray(timeline.tracks)) {
    throw new TimelineValidationError("timeline.tracks must be an array");
  }

  for (const track of timeline.tracks) {
    validateTrack(track, timeline.durationInFrames);
    if (track.type === "group") {
      if (!Array.isArray(track.children)) {
        throw new TimelineValidationError(`group ${track.id} must have children array`);
      }
      if (track.clips.length > 0) {
        throw new TimelineValidationError(`group ${track.id} must not contain clips`);
      }
      for (const child of track.children) {
        validateTrack(child, timeline.durationInFrames);
      }
    }
  }
}

function validateTrack(track: Track, durationInFrames: number): void {
  if (!TRACK_TYPES.includes(track.type)) {
    throw new TimelineValidationError(`invalid track type: ${track.type}`);
  }
  for (const clip of track.clips) {
    assertClipInBounds(clip, durationInFrames);
  }
  assertNoOverlapOnTrack(track);
}
