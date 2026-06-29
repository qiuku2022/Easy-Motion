const { ensureTimelineFitsClip } = require("@easymotion/shared");
const { createTrack, createClip } = require("./timeline-ops");
const { defaultPropsFromPreset } = require("./preset-catalog");

const ANIMATION_TRACK_NAME = "新动画轨道";

function getClipRange(clip) {
  return {
    start: clip.startInFrames,
    end: clip.startInFrames + clip.durationInFrames,
  };
}

function rangesOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

function hasOverlapOnTrack(track, candidate) {
  for (const clip of track.clips ?? []) {
    if (rangesOverlap(candidate, getClipRange(clip))) {
      return true;
    }
  }
  return false;
}

function clampMoveStart(startInFrames, durationInFrames, timelineDuration) {
  const duration = Math.max(1, Math.round(durationInFrames));
  const maxStart = Math.max(0, timelineDuration - duration);
  return Math.min(maxStart, Math.max(0, Math.round(startInFrames)));
}

function resolveAnimationTrack(timeline, preferredTrackId) {
  if (preferredTrackId) {
    const preferred = timeline.tracks.find((track) => track.id === preferredTrackId);
    if (preferred && !preferred.locked && preferred.type === "animation") {
      return { timeline, trackId: preferred.id };
    }
  }

  const existing = timeline.tracks.find(
    (track) => track.type === "animation" && !track.locked,
  );
  if (existing) {
    return { timeline, trackId: existing.id };
  }

  const created = createTrack(timeline, {
    name: ANIMATION_TRACK_NAME,
    type: "animation",
  });
  return { timeline: created.timeline, trackId: created.track.id };
}

function resolvePresetPlacement(timeline, trackId, startInFrames, durationInFrames) {
  const duration = Math.max(1, durationInFrames);
  let next = ensureTimelineFitsClip(timeline, startInFrames, duration);
  let start = clampMoveStart(startInFrames, duration, next.durationInFrames);
  let targetTrackId = trackId;

  const track = next.tracks.find((item) => item.id === targetTrackId);
  if (!track) {
    throw new Error("轨道不存在");
  }

  const overlaps = hasOverlapOnTrack(track, { start, end: start + duration });
  if (overlaps) {
    const created = createTrack(next, {
      name: ANIMATION_TRACK_NAME,
      type: "animation",
    });
    next = created.timeline;
    targetTrackId = created.track.id;
    next = ensureTimelineFitsClip(next, start, duration);
    start = clampMoveStart(startInFrames, duration, next.durationInFrames);
  }

  return { timeline: next, trackId: targetTrackId, startInFrames: start };
}

function placePresetOnTimeline(timeline, preset, options = {}) {
  if (preset.kind !== "component" || !preset.component) {
    throw new Error("仅支持组件类预设");
  }

  const { timeline: withTrack, trackId } = resolveAnimationTrack(
    timeline,
    options.trackId,
  );

  const startInFrames = Math.max(0, Number(options.startInFrames ?? 0));
  const durationInFrames = Math.max(1, preset.durationInFrames);
  const placement = resolvePresetPlacement(
    withTrack,
    trackId,
    startInFrames,
    durationInFrames,
  );

  const source = {
    kind: "component",
    component: preset.component,
    presetId: preset.id,
  };
  const props = {
    ...defaultPropsFromPreset(preset),
    ...(options.parameters ?? {}),
  };
  if (Object.keys(props).length > 0) {
    source.props = props;
  }

  const result = createClip(placement.timeline, {
    trackId: placement.trackId,
    name: preset.name,
    startInFrames: placement.startInFrames,
    durationInFrames,
    source,
  });

  return {
    timeline: result.timeline,
    clipId: result.clip.id,
    trackId: placement.trackId,
  };
}

module.exports = { placePresetOnTimeline, resolveAnimationTrack };
