/** 与 docs/requirements/时间线编辑.md group 编译规则一致 */

const { isTrackIncludedInPreview } = require("@easymotion/shared");

function flattenTracksForCompile(tracks) {
  const sorted = [...tracks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const weighted = [];

  sorted.forEach((track, parentIndex) => {
    if (track.type === "group") {
      if (!track.visible) return;
      const children = [...(track.children ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );
      children.forEach((child, childIndex) => {
        if (!isTrackIncludedInPreview(child, track, tracks)) return;
        weighted.push({
          track: child,
          order: parentIndex * 1000 + childIndex,
        });
      });
      return;
    }
    if (isTrackIncludedInPreview(track, null, tracks)) {
      weighted.push({ track, order: parentIndex * 1000 });
    }
  });

  return weighted.sort((a, b) => a.order - b.order).map((item) => item.track);
}

module.exports = { flattenTracksForCompile };
