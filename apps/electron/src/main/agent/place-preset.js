const { createTrack, createClip } = require("./timeline-ops");
const { defaultPropsFromPreset } = require("./preset-catalog");

const ANIMATION_TRACK_NAME = "新动画轨道";

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

function placePresetOnTimeline(timeline, preset, options = {}) {
  if (preset.kind !== "component" || !preset.component) {
    throw new Error("仅支持组件类预设");
  }

  const { timeline: withTrack, trackId } = resolveAnimationTrack(
    timeline,
    options.trackId,
  );

  const startInFrames = Math.max(
    0,
    Math.min(
      Number(options.startInFrames ?? 0),
      withTrack.durationInFrames - 1,
    ),
  );
  const durationInFrames = Math.max(
    1,
    Math.min(
      preset.durationInFrames,
      withTrack.durationInFrames - startInFrames,
    ),
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

  const result = createClip(withTrack, {
    trackId,
    name: preset.name,
    startInFrames,
    durationInFrames,
    source,
  });

  return {
    timeline: result.timeline,
    clipId: result.clip.id,
    trackId,
  };
}

module.exports = { placePresetOnTimeline, resolveAnimationTrack };
