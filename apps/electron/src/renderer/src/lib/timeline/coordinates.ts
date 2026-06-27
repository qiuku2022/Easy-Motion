/**
 * 时间线位置：左下角 (0,0)，Y 向上增加。
 * 与 packages/shared/src/coordinates.js 保持逻辑一致（渲染层独立实现，避免 Vite 读 CJS 命名导出失败）。
 */
import type { Clip, Timeline, Track } from "@/types/timeline";

export const TIMELINE_COORDINATE_ORIGIN = "bottom-left" as const;

function snapAxis(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

function clampAxis(value: number, max: number): number {
  const snapped = snapAxis(value);
  if (!Number.isFinite(max) || max <= 0) return snapped;
  return Math.min(max, Math.max(0, snapped));
}

export function timelineYToCssTop(y: number, compositionHeight: number): number {
  const height = Number(compositionHeight);
  if (!Number.isFinite(height) || height <= 0) return snapAxis(y);
  return clampAxis(height - y, height);
}

export function cssTopToTimelineY(cssTop: number, compositionHeight: number): number {
  const height = Number(compositionHeight);
  if (!Number.isFinite(height) || height <= 0) return snapAxis(cssTop);
  return clampAxis(height - cssTop, height);
}

export function resolveLayerScreenPosition(
  x: number,
  y: number,
  compositionHeight: number,
): { left: number; top: number } {
  return {
    left: snapAxis(x),
    top: timelineYToCssTop(y, compositionHeight),
  };
}

export function clampTimelinePosition(
  x: number,
  y: number,
  width: number,
  height: number,
): { x: number; y: number } {
  return {
    x: clampAxis(x, width),
    y: clampAxis(y, height),
  };
}

function migrateClipPositionToBottomLeft(clip: Clip, canvasHeight: number): Clip {
  let next = clip;
  const pos = clip.transform?.position;
  if (pos && typeof pos.y === "number" && Number.isFinite(pos.y)) {
    next = {
      ...next,
      transform: {
        ...next.transform,
        position: {
          x: pos.x ?? 0,
          y: canvasHeight - pos.y,
        },
      },
    };
  }

  if (Array.isArray(clip.keyframes) && clip.keyframes.length > 0) {
    const keyframes = clip.keyframes.map((kf) => {
      if (
        kf.property === "transform.position.y" &&
        typeof kf.value === "number" &&
        Number.isFinite(kf.value)
      ) {
        return { ...kf, value: canvasHeight - kf.value };
      }
      return kf;
    });
    next = { ...next, keyframes };
  }

  return next;
}

function migrateTrackPositionsToBottomLeft(track: Track, canvasHeight: number): Track {
  if (track.type === "group") {
    const children = (track.children ?? []).map((child) =>
      migrateTrackPositionsToBottomLeft(child, canvasHeight),
    );
    return { ...track, children };
  }

  const clips = (track.clips ?? []).map((clip) =>
    migrateClipPositionToBottomLeft(clip, canvasHeight),
  );
  return { ...track, clips };
}

/** 将旧版左上角坐标时间线迁移为左下角原点（幂等） */
export function migrateTimelineToBottomLeft(timeline: Timeline): {
  timeline: Timeline;
  migrated: boolean;
} {
  if (timeline.coordinateOrigin === TIMELINE_COORDINATE_ORIGIN) {
    return { timeline, migrated: false };
  }

  const height = Number(timeline.height) || 1080;
  const tracks = timeline.tracks.map((track) =>
    migrateTrackPositionsToBottomLeft(track, height),
  );

  return {
    timeline: {
      ...timeline,
      tracks,
      coordinateOrigin: TIMELINE_COORDINATE_ORIGIN,
    },
    migrated: true,
  };
}
