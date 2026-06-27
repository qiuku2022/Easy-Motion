/**
 * 时间线位置坐标：左下角为 (0,0)，X 向右增至 width，Y 向上增至 height。
 * Remotion/CSS 使用左上角原点，渲染时需转换 Y。
 */

const BOTTOM_LEFT = "bottom-left";

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function snapAxis(value) {
  if (!isFiniteNumber(value)) return 0;
  return Math.round(value);
}

function clampAxis(value, max) {
  const snapped = snapAxis(value);
  if (!isFiniteNumber(max) || max <= 0) return snapped;
  return Math.min(max, Math.max(0, snapped));
}

/** 时间线 Y → CSS top（Remotion 合成像素） */
function timelineYToCssTop(y, compositionHeight) {
  const height = Number(compositionHeight);
  if (!Number.isFinite(height) || height <= 0) return snapAxis(y);
  return clampAxis(height - y, height);
}

/** CSS top → 时间线 Y */
function cssTopToTimelineY(cssTop, compositionHeight) {
  const height = Number(compositionHeight);
  if (!Number.isFinite(height) || height <= 0) return snapAxis(cssTop);
  return clampAxis(height - cssTop, height);
}

function resolveLayerScreenPosition(x, y, compositionHeight) {
  return {
    left: snapAxis(x),
    top: timelineYToCssTop(y, compositionHeight),
  };
}

function clampTimelinePosition(x, y, width, height) {
  return {
    x: clampAxis(x, width),
    y: clampAxis(y, height),
  };
}

function migrateClipPositionToBottomLeft(clip, height) {
  let next = clip;
  const pos = clip.transform?.position;
  if (pos && isFiniteNumber(pos.y)) {
    next = {
      ...next,
      transform: {
        ...next.transform,
        position: {
          x: pos.x ?? 0,
          y: height - pos.y,
        },
      },
    };
  }

  if (Array.isArray(clip.keyframes) && clip.keyframes.length > 0) {
    const keyframes = clip.keyframes.map((kf) => {
      if (kf.property === "transform.position.y" && isFiniteNumber(kf.value)) {
        return { ...kf, value: height - kf.value };
      }
      return kf;
    });
    next = { ...next, keyframes };
  }

  return next;
}

function migrateTrackPositionsToBottomLeft(track, height) {
  if (track.type === "group") {
    const children = (track.children ?? []).map((child) =>
      migrateTrackPositionsToBottomLeft(child, height),
    );
    return { ...track, children };
  }

  const clips = (track.clips ?? []).map((clip) =>
    migrateClipPositionToBottomLeft(clip, height),
  );
  return { ...track, clips };
}

/** 将旧版左上角坐标时间线迁移为左下角原点（幂等） */
function migrateTimelineToBottomLeft(timeline) {
  if (timeline?.coordinateOrigin === BOTTOM_LEFT) {
    return { timeline, migrated: false };
  }

  const height = Number(timeline?.height) || 1080;
  const tracks = (timeline.tracks ?? []).map((track) =>
    migrateTrackPositionsToBottomLeft(track, height),
  );

  return {
    timeline: {
      ...timeline,
      tracks,
      coordinateOrigin: BOTTOM_LEFT,
    },
    migrated: true,
  };
}

module.exports = {
  TIMELINE_COORDINATE_ORIGIN: BOTTOM_LEFT,
  timelineYToCssTop,
  cssTopToTimelineY,
  resolveLayerScreenPosition,
  clampTimelinePosition,
  migrateTimelineToBottomLeft,
};
