import type { Clip, Timeline, Track, TrackType } from "@/types/timeline";
import { isCompositeLayerType } from "@/lib/timeline/contentType";
import { resolveEditableClipType } from "@/lib/timeline/clipPropertySchema";
import { isTrackIncludedInPreview } from "@/lib/timeline/solo";

export interface LayerElement {
  track: Track;
  clip: Clip;
  contentType: TrackType;
}

/** 时间线 UI 扁平行（group 头 + 展开的 children） */
export interface TimelineRow {
  track: Track;
  depth: number;
  parentGroup: Track | null;
  /** group 轨道头行（无 clip，仅折叠/命名） */
  isGroupHeader: boolean;
}

export function effectiveTrackState(
  track: Track,
  parentGroup: Track | null,
  timeline?: Timeline | null,
): { locked: boolean; visible: boolean; solo: boolean } {
  const parentLocked = parentGroup?.locked ?? false;
  const parentHidden = parentGroup ? !parentGroup.visible : false;
  const baseVisible = track.visible && !parentHidden;

  if (track.type === "group") {
    return {
      locked: track.locked || parentLocked,
      visible: baseVisible,
      solo: Boolean((track.children ?? []).some((c) => c.solo)),
    };
  }

  const includedInPreview = timeline
    ? isTrackIncludedInPreview(track, parentGroup, timeline.tracks)
    : baseVisible;

  return {
    locked: track.locked || parentLocked,
    visible: baseVisible && includedInPreview,
    solo: Boolean(track.solo),
  };
}

/** 预览/编译：order 升序（小=底层先画） */
export function sortTracksForPreview(tracks: Track[]): Track[] {
  return [...tracks].sort((a, b) => a.order - b.order);
}

/** 时间线 UI：order 降序（大=前景，显示在上方） */
export function sortTracksForTimelineUi(tracks: Track[]): Track[] {
  return [...tracks].sort((a, b) => b.order - a.order);
}

function sortChildrenForTimelineUi(children: Track[]): Track[] {
  return [...children].sort((a, b) => b.order - a.order);
}

export function buildTimelineRows(tracks: Track[]): TimelineRow[] {
  const sorted = sortTracksForTimelineUi(tracks);
  const rows: TimelineRow[] = [];

  for (const track of sorted) {
    if (track.type === "group") {
      rows.push({
        track,
        depth: 0,
        parentGroup: null,
        isGroupHeader: true,
      });
      if (!track.collapsed && track.children?.length) {
        const children = sortChildrenForTimelineUi(track.children);
        for (const child of children) {
          rows.push({
            track: child,
            depth: 1,
            parentGroup: track,
            isGroupHeader: false,
          });
        }
      }
    } else {
      rows.push({
        track,
        depth: 0,
        parentGroup: null,
        isGroupHeader: false,
      });
    }
  }

  return rows;
}

/** 编译用：group.children 扁平化，order = 父 order 为主序、子 order 为次序 */
export function flattenTracksForCompile(tracks: Track[]): Track[] {
  const sorted = sortTracksForPreview(tracks);
  const weighted: { track: Track; order: number }[] = [];

  sorted.forEach((track, parentIndex) => {
    if (track.type === "group") {
      if (!track.visible) return;
      const children = [...(track.children ?? [])].sort((a, b) => a.order - b.order);
      children.forEach((child, childIndex) => {
        if (!child.visible) return;
        weighted.push({
          track: child,
          order: parentIndex * 1000 + childIndex,
        });
      });
      return;
    }
    if (track.visible) {
      weighted.push({ track, order: parentIndex * 1000 });
    }
  });

  return weighted.sort((a, b) => a.order - b.order).map((item) => item.track);
}

/** 可放置/拖拽片段的叶子轨道（不含 group 头） */
export function getLeafTracks(tracks: Track[]): Track[] {
  const rows = buildTimelineRows(tracks);
  return rows.filter((r) => !r.isGroupHeader).map((r) => r.track);
}

export function findTrackById(timeline: Timeline, trackId: string): Track | null {
  for (const track of timeline.tracks) {
    if (track.id === trackId) return track;
    if (track.children) {
      const child = track.children.find((c) => c.id === trackId);
      if (child) return child;
    }
  }
  return null;
}

export function findParentGroup(
  timeline: Timeline,
  trackId: string,
): Track | null {
  for (const track of timeline.tracks) {
    if (track.type !== "group" || !track.children) continue;
    if (track.children.some((c) => c.id === trackId)) return track;
  }
  return null;
}

export function findLayerTrackForClip(
  timeline: Timeline,
  clipId: string,
): { layerTrack: Track; clipTrack: Track; clip: Clip } | null {
  for (const layerTrack of timeline.tracks) {
    const direct = layerTrack.clips.find((c) => c.id === clipId);
    if (direct) {
      return { layerTrack, clipTrack: layerTrack, clip: direct };
    }
    if (layerTrack.children) {
      for (const child of layerTrack.children) {
        const nested = child.clips.find((c) => c.id === clipId);
        if (nested) {
          return { layerTrack, clipTrack: child, clip: nested };
        }
      }
    }
  }
  return null;
}

export function collectLayerElements(layerTrack: Track): LayerElement[] {
  if (layerTrack.type === "group" && layerTrack.children?.length) {
    const elements: LayerElement[] = [];
    for (const child of layerTrack.children) {
      for (const clip of child.clips) {
        elements.push({
          track: child,
          clip,
          contentType: resolveEditableClipType(clip, child.type) ?? child.type,
        });
      }
    }
    return elements;
  }

  return layerTrack.clips.map((clip) => ({
    track: layerTrack,
    clip,
    contentType: resolveEditableClipType(clip, layerTrack.type) ?? layerTrack.type,
  }));
}

export function pickDefaultContentElement(
  elements: LayerElement[],
): LayerElement | null {
  const editable = elements.filter(
    (e) => resolveEditableClipType(e.clip, e.track.type) != null,
  );
  if (editable.length === 0) return null;
  const text = editable.find(
    (e) => resolveEditableClipType(e.clip, e.track.type) === "text",
  );
  if (text) return text;
  return editable[0]!;
}

export function resolveLayerTransformClip(layerTrack: Track): Clip | null {
  if (isCompositeLayerType(layerTrack.type) && layerTrack.clips.length > 0) {
    return layerTrack.clips[0] ?? null;
  }
  if (layerTrack.type !== "group" && layerTrack.clips.length === 1) {
    return layerTrack.clips[0] ?? null;
  }
  const elements = collectLayerElements(layerTrack);
  const editable = elements.filter(
    (e) => resolveEditableClipType(e.clip, e.track.type) != null,
  );
  if (editable.length === 1) return editable[0]!.clip;
  return layerTrack.clips[0] ?? editable[0]?.clip ?? null;
}

export function mapTracksInTimeline(
  timeline: Timeline,
  mapper: (track: Track, parentGroup: Track | null) => Track,
): Timeline {
  const tracks = timeline.tracks.map((track) => {
    if (track.type === "group" && track.children?.length) {
      return {
        ...track,
        children: track.children.map((child) => mapper(child, track)),
      };
    }
    return mapper(track, null);
  });
  return { ...timeline, tracks };
}
