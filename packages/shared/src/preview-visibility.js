const { isTrackIncludedInPreview } = require("./track-solo");

function findClipTrackContext(tracks, clipId) {
  for (const track of tracks ?? []) {
    for (const clip of track.clips ?? []) {
      if (clip.id === clipId) {
        return { track, parent: null };
      }
    }
    if (track.type === "group") {
      for (const child of track.children ?? []) {
        for (const clip of child.clips ?? []) {
          if (clip.id === clipId) {
            return { track: child, parent: track };
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

module.exports = {
  findClipTrackContext,
  isClipVisibleInPreview,
};
