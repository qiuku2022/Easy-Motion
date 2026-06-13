const { isTrackIncludedInPreview } = require("./track-solo");

function findClipTrackContext(tracks, clipId) {
  for (const track of tracks ?? []) {
    for (const clip of track.clips ?? []) {
      if (clip.id === clipId) {
        return { track, parent: null, clip };
      }
    }
    if (track.type === "group") {
      for (const child of track.children ?? []) {
        for (const clip of child.clips ?? []) {
          if (clip.id === clipId) {
            return { track: child, parent: track, clip };
          }
        }
      }
    }
  }
  return null;
}

function isClipVisibleInPreview(clipId, timeline) {
  if (!timeline?.tracks) return true;
  const ctx = findClipTrackContext(timeline.tracks, clipId);
  if (!ctx) return true;
  return isTrackIncludedInPreview(ctx.track, ctx.parent, timeline.tracks);
}

/** 预览 iframe 推送 timeline 时，按 JSON 片段头尾驱动 Sequence */
function getClipTimingForPreview(clipId, timeline) {
  if (!timeline?.tracks) return null;
  const ctx = findClipTrackContext(timeline.tracks, clipId);
  if (!ctx?.clip) return null;
  const start = Number(ctx.clip.startInFrames);
  const duration = Number(ctx.clip.durationInFrames);
  if (!Number.isFinite(start) || !Number.isFinite(duration) || duration < 1) {
    return null;
  }
  return { startInFrames: start, durationInFrames: duration };
}

module.exports = {
  findClipTrackContext,
  isClipVisibleInPreview,
  getClipTimingForPreview,
};
