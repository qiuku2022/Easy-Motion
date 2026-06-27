/**
 * Premiere-style work area (I/O) + export frame range resolution.
 * Shared between renderer and main-process export.
 */

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clampInt(value, min, max) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function forEachTimelineClip(timeline, visit) {
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

/**
 * First frame index after the last clip (exclusive). At least 1 when empty.
 */
function getContentEndExclusive(timeline) {
  let endExclusive = 1;

  forEachTimelineClip(timeline, (clip) => {
    const start = Number(clip.startInFrames) || 0;
    const duration = Number(clip.durationInFrames) || 0;
    const clipEnd = start + duration;
    if (clipEnd > endExclusive) endExclusive = clipEnd;
  });

  return Math.max(1, endExclusive);
}

/**
 * Last frame index that still has clip content (inclusive).
 * Returns at least 0 even when timeline is empty.
 */
function getContentEndInclusive(timeline) {
  const maxDuration = Math.max(1, Number(timeline?.durationInFrames) || 1);
  const endExclusive = getContentEndExclusive(timeline);
  const capped = Math.min(endExclusive, maxDuration);
  return Math.max(0, capped - 1);
}

/** Tail padding after content for placing new clips (~1s at timeline fps). */
function resolveTailPaddingFrames(timeline) {
  const fps = Math.max(1, Number(timeline?.fps) || 30);
  return Math.max(15, Math.round(fps));
}

/**
 * Shrink or grow timeline.durationInFrames to content end + tail padding.
 * Keeps work area in/out within the new bounds.
 */
function fitTimelineDuration(timeline, options = {}) {
  if (!isObject(timeline)) return timeline;

  const tail =
    options.tailPaddingFrames ?? resolveTailPaddingFrames(timeline);
  const minFrames = options.minDurationFrames ?? 30;
  const contentEndExclusive = getContentEndExclusive(timeline);
  const needed = Math.max(contentEndExclusive + tail, minFrames);
  const current = Math.max(1, Number(timeline.durationInFrames) || 1);

  const contentEndInclusive = Math.max(0, contentEndExclusive - 1);
  let next = { ...timeline, durationInFrames: needed };

  if (next.workArea) {
    const maxFrame = needed - 1;
    const rawOut = Number(next.workArea.outFrame);
    const rawIn = Number(next.workArea.inFrame);
    const outFrame = Math.min(
      Number.isFinite(rawOut) ? rawOut : contentEndInclusive,
      maxFrame,
      contentEndInclusive,
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

/** Duration used for timeline ruler / fit-to-width (same as fitTimelineDuration). */
function resolveTimelineViewportDuration(timeline) {
  if (!isObject(timeline)) return 1;
  return fitTimelineDuration(timeline).durationInFrames;
}

/**
 * Resolve export in/out (inclusive) for renderMedia frameRange.
 * - No workArea: [0, contentEnd]
 * - With workArea: user I/O clamped to timeline; out defaults to content end when missing
 */
function resolveExportFrameRange(timeline) {
  if (!isObject(timeline)) {
    return { inFrame: 0, outFrame: 0, frameCount: 1, contentEndInclusive: 0, custom: false };
  }

  const maxFrame = Math.max(0, Number(timeline.durationInFrames) - 1);
  const contentEndInclusive = getContentEndInclusive(timeline);
  const custom = isObject(timeline.workArea);

  let inFrame = custom ? Number(timeline.workArea.inFrame) : 0;
  let outFrame = custom
    ? Number(timeline.workArea.outFrame)
    : contentEndInclusive;

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

function normalizeWorkArea(timeline, inFrame, outFrame) {
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

function setWorkAreaInFrame(timeline, frame) {
  const contentEndInclusive = getContentEndInclusive(timeline);
  const current = timeline.workArea;
  const outFrame = current?.outFrame ?? contentEndInclusive;
  return {
    ...timeline,
    workArea: normalizeWorkArea(timeline, frame, outFrame),
  };
}

function setWorkAreaOutFrame(timeline, frame) {
  const current = timeline.workArea;
  const inFrame = current?.inFrame ?? 0;
  return {
    ...timeline,
    workArea: normalizeWorkArea(timeline, inFrame, frame),
  };
}

function clearWorkArea(timeline) {
  if (!timeline.workArea) return timeline;
  const next = { ...timeline };
  delete next.workArea;
  return next;
}

module.exports = {
  getContentEndExclusive,
  getContentEndInclusive,
  resolveTailPaddingFrames,
  fitTimelineDuration,
  resolveTimelineViewportDuration,
  resolveExportFrameRange,
  setWorkAreaInFrame,
  setWorkAreaOutFrame,
  clearWorkArea,
};
