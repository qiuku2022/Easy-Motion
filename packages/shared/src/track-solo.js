/** 轨道独奏：任一 leaf 轨道 solo 时，预览/编译仅包含 solo 轨道 */

function collectSoloTrackIds(tracks) {
  const ids = new Set();
  for (const track of tracks ?? []) {
    if (track.type === "group") {
      for (const child of track.children ?? []) {
        if (child.solo) ids.add(child.id);
      }
    } else if (track.solo) {
      ids.add(track.id);
    }
  }
  return ids;
}

function hasActiveSolo(tracks) {
  return collectSoloTrackIds(tracks).size > 0;
}

function isTrackIncludedInPreview(track, parentGroup, tracks) {
  if (!track.visible) return false;
  if (parentGroup && !parentGroup.visible) return false;
  if (!hasActiveSolo(tracks)) return true;
  return collectSoloTrackIds(tracks).has(track.id);
}

module.exports = {
  collectSoloTrackIds,
  hasActiveSolo,
  isTrackIncludedInPreview,
};
