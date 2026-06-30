import type { Clip, Timeline } from "@/types/timeline";

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clampInt(value: number, min: number, max: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function forEachTimelineClip(timeline: Timeline | null | undefined, visit: (clip: Clip) => void) {
  if (!timeline?.tracks?.length) return;

  for (const track of timeline.tracks) {
    if (track.type === "group") {
      if (track.visible === false) continue;
      for (const child of track.children ?? []) {
        if (child.visible === false) continue;
        for (const clip of child.clips ?? []) {
          visit(clip);
        }
      }
      continue;
    }
    if (track.visible === false) continue;
    for (const clip of track.clips ?? []) {
      visit(clip);
    }
  }
}

/** First frame index after the last clip (exclusive). At least 1 when empty. */
export function getContentEndExclusive(timeline: Timeline | null | undefined): number {
  let endExclusive = 1;

  forEachTimelineClip(timeline, (clip) => {
    const start = Number(clip.startInFrames) || 0;
    const duration = Number(clip.durationInFrames) || 0;
    const clipEnd = start + duration;
    if (clipEnd > endExclusive) endExclusive = clipEnd;
  });

  return Math.max(1, endExclusive);
}

/** Last frame index that still has clip content (inclusive). */
export function getContentEndInclusive(timeline: Timeline | null | undefined): number {
  const maxDuration = Math.max(1, Number(timeline?.durationInFrames) || 1);
  const endExclusive = getContentEndExclusive(timeline);
  const capped = Math.min(endExclusive, maxDuration);
  return Math.max(0, capped - 1);
}

export function resolveTailPaddingFrames(timeline: Timeline | null | undefined): number {
  const fps = Math.max(1, Number(timeline?.fps) || 30);
  return Math.max(15, Math.round(fps));
}

export function resolveDefaultMinDurationFrames(timeline: Timeline | null | undefined): number {
  const fps = Math.max(1, Number(timeline?.fps) || 30);
  return fps * 5;
}

/** 放置预设前拉长时间线，避免片段时长被当前 duration 截断 */
export function ensureTimelineFitsClip(
  timeline: Timeline,
  startInFrames: number,
  durationInFrames: number,
): Timeline {
  const start = Math.max(0, Math.round(startInFrames));
  const duration = Math.max(1, Math.round(durationInFrames));
  const needed = start + duration;
  const current = Math.max(1, Number(timeline.durationInFrames) || 1);
  if (needed <= current) return timeline;
  return { ...timeline, durationInFrames: needed };
}

/** Shrink or grow duration to content end + tail padding (~1s). */
export function fitTimelineDuration(
  timeline: Timeline,
  options: { tailPaddingFrames?: number; minDurationFrames?: number } = {},
): Timeline {
  const tail = options.tailPaddingFrames ?? resolveTailPaddingFrames(timeline);
  const minFrames =
    options.minDurationFrames ?? resolveDefaultMinDurationFrames(timeline);
  const contentEndExclusive = getContentEndExclusive(timeline);
  const needed = Math.max(contentEndExclusive + tail, minFrames);
  const current = Math.max(1, Number(timeline.durationInFrames) || 1);
  const contentEndInclusive = Math.max(0, contentEndExclusive - 1);

  let next: Timeline = { ...timeline, durationInFrames: needed };

  if (next.workArea) {
    const maxFrame = needed - 1;
    const rawOut = Number(next.workArea.outFrame);
    const rawIn = Number(next.workArea.inFrame);
    const outFrame = Math.min(
      Number.isFinite(rawOut) ? rawOut : contentEndInclusive,
      maxFrame,
    );
    const inFrame = Math.min(
      Number.isFinite(rawIn) ? rawIn : 0,
      outFrame,
      maxFrame,
    );
    next = {
      ...next,
      workArea: normalizeWorkArea(next, inFrame, outFrame),
    };
  }

  if (
    needed === current &&
    (!timeline.workArea ||
      (next.workArea?.inFrame === timeline.workArea.inFrame &&
        next.workArea?.outFrame === timeline.workArea.outFrame))
  ) {
    return timeline;
  }

  return next;
}

export function resolveTimelineViewportDuration(timeline: Timeline | null | undefined): number {
  if (!timeline) return 1;
  return fitTimelineDuration(timeline).durationInFrames;
}

export interface ExportFrameRange {
  inFrame: number;
  outFrame: number;
  frameCount: number;
  contentEndInclusive: number;
  custom: boolean;
}

/** Resolve export in/out (inclusive) for renderMedia frameRange. */
export function resolveExportFrameRange(
  timeline: Timeline | null | undefined,
): ExportFrameRange {
  if (!isObject(timeline)) {
    return { inFrame: 0, outFrame: 0, frameCount: 1, contentEndInclusive: 0, custom: false };
  }

  const maxFrame = Math.max(0, Number(timeline.durationInFrames) - 1);
  const contentEndInclusive = getContentEndInclusive(timeline);
  const custom = isObject(timeline.workArea);

  let inFrame = custom ? Number(timeline.workArea.inFrame) : 0;
  let outFrame = custom ? Number(timeline.workArea.outFrame) : contentEndInclusive;

  if (!Number.isFinite(inFrame)) inFrame = 0;
  if (!Number.isFinite(outFrame)) outFrame = contentEndInclusive;

  inFrame = clampInt(inFrame, 0, maxFrame);
  outFrame = clampInt(outFrame, 0, maxFrame);

  if (inFrame > outFrame) {
    const swap = inFrame;
    inFrame = outFrame;
    outFrame = swap;
  }

  outFrame = Math.min(outFrame, contentEndInclusive);

  const frameCount = Math.max(1, outFrame - inFrame + 1);

  return {
    inFrame,
    outFrame,
    frameCount,
    contentEndInclusive,
    custom,
  };
}

export interface WorkAreaDisplayRange {
  inFrame: number;
  outFrame: number;
  custom: boolean;
  contentEndInclusive: number;
}

/** UI I/O：按用户设置的入出点显示，不压到内容末尾 */
export function resolveWorkAreaDisplayRange(
  timeline: Timeline | null | undefined,
): WorkAreaDisplayRange {
  if (!isObject(timeline)) {
    return { inFrame: 0, outFrame: 0, custom: false, contentEndInclusive: 0 };
  }

  const maxFrame = Math.max(0, Number(timeline.durationInFrames) - 1);
  const contentEndInclusive = getContentEndInclusive(timeline);
  const custom = isObject(timeline.workArea);

  if (!custom) {
    return {
      inFrame: 0,
      outFrame: contentEndInclusive,
      custom: false,
      contentEndInclusive,
    };
  }

  let inFrame = Number(timeline.workArea.inFrame);
  let outFrame = Number(timeline.workArea.outFrame);
  if (!Number.isFinite(inFrame)) inFrame = 0;
  if (!Number.isFinite(outFrame)) outFrame = maxFrame;

  inFrame = clampInt(inFrame, 0, maxFrame);
  outFrame = clampInt(outFrame, 0, maxFrame);
  if (inFrame > outFrame) {
    const swap = inFrame;
    inFrame = outFrame;
    outFrame = swap;
  }

  return { inFrame, outFrame, custom: true, contentEndInclusive };
}

function normalizeWorkArea(timeline: Timeline, inFrame: number, outFrame: number) {
  const maxFrame = Math.max(0, Number(timeline.durationInFrames) - 1);
  let inF = clampInt(inFrame, 0, maxFrame);
  let outF = clampInt(outFrame, 0, maxFrame);
  if (inF > outF) {
    const t = inF;
    inF = outF;
    outF = t;
  }
  return { inFrame: inF, outFrame: outF };
}

export function setWorkAreaInFrame(timeline: Timeline, frame: number): Timeline {
  const maxFrame = Math.max(0, Number(timeline.durationInFrames) - 1);
  const current = timeline.workArea;
  const outFrame = current?.outFrame ?? maxFrame;
  return {
    ...timeline,
    workArea: normalizeWorkArea(timeline, frame, outFrame),
  };
}

export function setWorkAreaOutFrame(timeline: Timeline, frame: number): Timeline {
  const current = timeline.workArea;
  const inFrame = current?.inFrame ?? 0;
  return {
    ...timeline,
    workArea: normalizeWorkArea(timeline, inFrame, frame),
  };
}

export function clearWorkArea(timeline: Timeline): Timeline {
  if (!timeline.workArea) return timeline;
  const next = { ...timeline };
  delete next.workArea;
  return next;
}
