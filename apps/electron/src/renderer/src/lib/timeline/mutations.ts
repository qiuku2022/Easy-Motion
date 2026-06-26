import {
  clampClipDuration,
  clampClipStart,
  clampMoveStart,
  clampResizeLeft,
  clampResizeRight,
  findClipTrack,
  getClipRange,
  hasOverlapOnTrack,
} from "@/lib/timeline/clipCollision";
import { findLayerTrackForClip, findParentGroup, findTrackById } from "@/lib/timeline/trackTree";
import {
  createDefaultTextClip,
  defaultClipForTrackType,
  trackTypeNeedsDefaultClip,
} from "@/lib/timeline/defaultClips";
import { defaultTrackName } from "@/lib/timeline/trackLabels";
import {
  defaultMarkerName,
  findMarkerAtFrame,
  newMarkerId,
  normalizeMarkers,
} from "@/lib/timeline/markers";
import { assertValidTimeline } from "@/lib/timeline/validate";
import type { Clip, Timeline, TimelineMarker, Track, TrackType } from "@/types/timeline";

export function cloneTimeline(timeline: Timeline): Timeline {
  return structuredClone(timeline);
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function sortTracksByOrder(tracks: Track[]): Track[] {
  return [...tracks].sort((a, b) => a.order - b.order);
}

function withValidated(timeline: Timeline): Timeline {
  assertValidTimeline(timeline);
  return timeline;
}

export function addTrack(
  timeline: Timeline,
  type: TrackType,
  name?: string,
): Timeline {
  const maxOrder = timeline.tracks.reduce((max, t) => Math.max(max, t.order), -1);
  const track: Track = {
    id: newId("track"),
    name: name ?? defaultTrackName(type),
    type,
    order: maxOrder + 1,
    visible: true,
    locked: false,
    muted: false,
    solo: false,
    clips: trackTypeNeedsDefaultClip(type)
      ? [defaultClipForTrackType(timeline, type)]
      : [],
    ...(type === "group"
      ? { children: [] as Track[], collapsed: false }
      : {}),
  };
  return withValidated({
    ...timeline,
    tracks: [...timeline.tracks, track],
  });
}

function mapTrackById(
  tracks: Track[],
  trackId: string,
  updater: (track: Track) => Track,
): { tracks: Track[]; changed: boolean } {
  let changed = false;
  const next = tracks.map((track) => {
    if (track.id === trackId) {
      changed = true;
      return updater(track);
    }
    if (track.children?.length) {
      let childChanged = false;
      const children = track.children.map((child) => {
        if (child.id !== trackId) return child;
        childChanged = true;
        return updater(child);
      });
      if (childChanged) {
        changed = true;
        return { ...track, children };
      }
    }
    return track;
  });
  return { tracks: next, changed };
}

export function addChildTrack(
  timeline: Timeline,
  groupId: string,
  type: TrackType,
  name?: string,
): Timeline {
  const group = findTrackById(timeline, groupId);
  if (!group || group.type !== "group") {
    throw new Error("目标不是分组图层");
  }
  if (group.locked) throw new Error("分组已锁定");

  const children = group.children ?? [];
  const maxOrder = children.reduce((max, t) => Math.max(max, t.order), -1);
  const child: Track = {
    id: newId("track"),
    name: name ?? defaultTrackName(type),
    type,
    order: maxOrder + 1,
    visible: true,
    locked: false,
    muted: false,
    solo: false,
    clips: trackTypeNeedsDefaultClip(type)
      ? [defaultClipForTrackType(timeline, type)]
      : [],
  };

  return patchTrack(timeline, groupId, (t) => ({
    ...t,
    children: [...(t.children ?? []), child],
    collapsed: false,
  }));
}

export function toggleGroupCollapsed(
  timeline: Timeline,
  groupId: string,
): Timeline {
  return patchTrack(timeline, groupId, (t) => {
    if (t.type !== "group") return t;
    return { ...t, collapsed: !t.collapsed };
  });
}

export function removeTrack(timeline: Timeline, trackId: string): Timeline {
  const topFiltered = timeline.tracks.filter((t) => t.id !== trackId);
  if (topFiltered.length !== timeline.tracks.length) {
    return withValidated({ ...timeline, tracks: topFiltered });
  }

  const tracks = timeline.tracks.map((track) => {
    if (track.type !== "group" || !track.children?.length) return track;
    const children = track.children.filter((c) => c.id !== trackId);
    if (children.length === track.children.length) return track;
    return { ...track, children };
  });

  return withValidated({ ...timeline, tracks });
}

/** @param trackIdsTopToBottom 时间线从上到下（前景→背景）的顶层轨道 id */
export function reorderTracks(timeline: Timeline, trackIdsTopToBottom: string[]): Timeline {
  const byId = new Map(timeline.tracks.map((t) => [t.id, t]));
  const tracks: Track[] = [];
  const n = trackIdsTopToBottom.length;
  trackIdsTopToBottom.forEach((id, uiIndex) => {
    const track = byId.get(id);
    if (track) tracks.push({ ...track, order: n - 1 - uiIndex });
    byId.delete(id);
  });
  for (const track of byId.values()) {
    tracks.push({ ...track, order: tracks.length });
  }
  return withValidated({ ...timeline, tracks });
}

export function toggleTrackVisibility(timeline: Timeline, trackId: string): Timeline {
  return patchTrack(timeline, trackId, (t) => {
    const nextVisible = !t.visible;
    if (t.type === "group" && t.children?.length) {
      return {
        ...t,
        visible: nextVisible,
        children: t.children.map((c) => ({ ...c, visible: nextVisible })),
      };
    }
    return { ...t, visible: nextVisible };
  });
}

export function toggleTrackLock(timeline: Timeline, trackId: string): Timeline {
  return patchTrack(timeline, trackId, (t) => {
    const nextLocked = !t.locked;
    if (t.type === "group" && t.children?.length) {
      return {
        ...t,
        locked: nextLocked,
        children: t.children.map((c) => ({ ...c, locked: nextLocked })),
      };
    }
    return { ...t, locked: nextLocked };
  });
}

export function toggleTrackMuted(timeline: Timeline, trackId: string): Timeline {
  return patchTrack(timeline, trackId, (t) => ({ ...t, muted: !t.muted }));
}

/** 切换轨道独奏；exclusive 为 true 时仅保留当前轨道独奏 */
export function toggleTrackSolo(
  timeline: Timeline,
  trackId: string,
  exclusive = false,
): Timeline {
  const target = findTrackById(timeline, trackId);
  if (!target) throw new Error("轨道不存在");
  if (target.type === "group") throw new Error("请对子轨道使用独奏");

  const nextSolo = exclusive ? true : !target.solo;

  const tracks = timeline.tracks.map((track) => {
    if (track.type === "group") {
      const children = (track.children ?? []).map((child) => ({
        ...child,
        solo:
          child.id === trackId
            ? nextSolo
            : exclusive
              ? false
              : child.solo,
      }));
      return { ...track, children };
    }
    return {
      ...track,
      solo:
        track.id === trackId ? nextSolo : exclusive ? false : track.solo,
    };
  });

  return withValidated({ ...timeline, tracks });
}

function patchTrack(
  timeline: Timeline,
  trackId: string,
  patch: (track: Track) => Track,
): Timeline {
  const { tracks, changed } = mapTrackById(timeline.tracks, trackId, patch);
  if (!changed) return timeline;
  return withValidated({ ...timeline, tracks });
}

export function addClip(timeline: Timeline, trackId: string, clip: Clip): Timeline {
  const { tracks, changed } = mapTrackById(timeline.tracks, trackId, (track) => {
    if (track.locked) throw new Error("轨道已锁定");
    const start = clampClipStart(
      clip.startInFrames,
      clip.durationInFrames,
      timeline.durationInFrames,
    );
    const normalized: Clip = {
      ...clip,
      startInFrames: start,
      durationInFrames: clampClipDuration(
        clip.durationInFrames,
        start,
        timeline.durationInFrames,
      ),
      lastModifiedBy: clip.lastModifiedBy ?? "user",
    };
    if (hasOverlapOnTrack(track, getClipRange(normalized))) {
      throw new Error("与同轨道其它片段重叠");
    }
    return { ...track, clips: [...track.clips, normalized] };
  });
  if (!changed) throw new Error("轨道不存在");
  return withValidated({ ...timeline, tracks });
}

export function removeClip(timeline: Timeline, trackId: string, clipId: string): Timeline {
  const { tracks, changed } = mapTrackById(timeline.tracks, trackId, (track) => {
    if (track.locked) throw new Error("轨道已锁定");
    return { ...track, clips: track.clips.filter((c) => c.id !== clipId) };
  });
  if (!changed) throw new Error("轨道不存在");
  return withValidated({ ...timeline, tracks });
}

export function moveClip(
  timeline: Timeline,
  clipId: string,
  targetTrackId: string,
  newStartInFrames: number,
): Timeline {
  const located = findClipTrack(timeline, clipId);
  if (!located) throw new Error("片段不存在");

  const { track: sourceTrack, clip } = located;
  if (sourceTrack.locked) throw new Error("源轨道已锁定");

  const targetTrack = findTrackById(timeline, targetTrackId);
  if (!targetTrack) throw new Error("目标轨道不存在");
  if (targetTrack.type === "group") throw new Error("不能将片段放到分组头行");
  if (targetTrack.locked) throw new Error("目标轨道已锁定");
  if (clip.type !== targetTrack.type) {
    throw new Error("片段类型与轨道类型不匹配");
  }

  const start = clampMoveStart(
    newStartInFrames,
    clip.durationInFrames,
    timeline.durationInFrames,
  );
  const candidate = getClipRange({ ...clip, startInFrames: start });

  if (hasOverlapOnTrack(targetTrack, candidate, clipId)) {
    throw new Error("与同轨道其它片段重叠");
  }

  const movingBetweenTracks = sourceTrack.id !== targetTrackId;
  const tracks = timeline.tracks.map((track) => {
    let next = track;

    if (track.id === sourceTrack.id || track.children?.some((c) => c.id === sourceTrack.id)) {
      next = mapTrackById([track], sourceTrack.id, (t) => {
        const clips = movingBetweenTracks
          ? t.clips.filter((c) => c.id !== clipId)
          : t.clips.map((c) =>
              c.id === clipId
                ? { ...c, startInFrames: start, lastModifiedBy: "user" as const, lastModifiedAt: Date.now() }
                : c,
            );
        return { ...t, clips };
      }).tracks[0]!;
    }

    if (movingBetweenTracks && (next.id === targetTrackId || next.children?.some((c) => c.id === targetTrackId))) {
      next = mapTrackById([next], targetTrackId, (t) => {
        const moved: Clip = {
          ...clip,
          startInFrames: start,
          lastModifiedBy: "user",
          lastModifiedAt: Date.now(),
        };
        return { ...t, clips: [...t.clips, moved] };
      }).tracks[0]!;
    }

    return next;
  });

  return withValidated({ ...timeline, tracks });
}

export function resizeClip(
  timeline: Timeline,
  clipId: string,
  edge: "left" | "right",
  newStartInFrames: number,
  newDurationInFrames: number,
): Timeline {
  const located = findClipTrack(timeline, clipId);
  if (!located) throw new Error("片段不存在");
  if (located.track.locked) throw new Error("轨道已锁定");

  const { clip } = located;
  let start: number;
  let duration: number;

  if (edge === "left") {
    const fixedEnd = clip.startInFrames + clip.durationInFrames;
    const clamped = clampResizeLeft(
      newStartInFrames,
      fixedEnd,
      timeline.durationInFrames,
    );
    start = clamped.startInFrames;
    duration = clamped.durationInFrames;
  } else {
    const fixedEnd = newStartInFrames + newDurationInFrames;
    const clamped = clampResizeRight(
      clip.startInFrames,
      fixedEnd,
      timeline.durationInFrames,
    );
    start = clamped.startInFrames;
    duration = clamped.durationInFrames;
  }

  const candidate = getClipRange({ ...clip, startInFrames: start, durationInFrames: duration });
  if (hasOverlapOnTrack(located.track, candidate, clipId)) {
    throw new Error("与同轨道其它片段重叠");
  }

  const tracks = timeline.tracks.map((track) =>
    mapTrackById([track], located.track.id, (t) => ({
      ...t,
      clips: t.clips.map((c) =>
        c.id === clipId
          ? {
              ...c,
              startInFrames: start,
              durationInFrames: duration,
              lastModifiedBy: "user" as const,
              lastModifiedAt: Date.now(),
            }
          : c,
      ),
    })).tracks[0]!,
  );

  return withValidated({ ...timeline, tracks });
}

export function splitClip(
  timeline: Timeline,
  clipId: string,
  splitFrame: number,
): Timeline {
  const located = findClipTrack(timeline, clipId);
  if (!located) throw new Error("片段不存在");
  if (located.track.locked) throw new Error("轨道已锁定");

  const { clip, track } = located;
  const range = getClipRange(clip);
  if (splitFrame <= range.start || splitFrame >= range.end) {
    throw new Error("分割位置必须在片段内部");
  }

  const firstDuration = splitFrame - range.start;
  const secondDuration = range.end - splitFrame;

  const first: Clip = {
    ...clip,
    durationInFrames: firstDuration,
    lastModifiedBy: "user",
    lastModifiedAt: Date.now(),
  };
  const second: Clip = {
    ...structuredClone(clip),
    id: newId("clip"),
    name: `${clip.name} (2)`,
    startInFrames: splitFrame,
    durationInFrames: secondDuration,
    lastModifiedBy: "user",
    lastModifiedAt: Date.now(),
  };

  const tracks = timeline.tracks.map((t) =>
    mapTrackById([t], track.id, (row) => {
      const clips = row.clips.flatMap((c) => (c.id === clipId ? [first, second] : [c]));
      return { ...row, clips };
    }).tracks[0]!,
  );

  return withValidated({ ...timeline, tracks });
}

export function renameTrack(timeline: Timeline, trackId: string, name: string): Timeline {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("轨道名称不能为空");
  return patchTrack(timeline, trackId, (t) => ({ ...t, name: trimmed }));
}

export interface ClipPatch {
  name?: string;
  startInFrames?: number;
  durationInFrames?: number;
  source?: Record<string, unknown>;
  style?: Record<string, unknown>;
  transform?: {
    position?: { x?: number; y?: number };
    scale?: number;
    rotation?: number;
    opacity?: number;
  };
  animations?: {
    in?: { type?: string; durationInFrames?: number };
    out?: { type?: string; durationInFrames?: number };
  };
  keyframes?: Clip["keyframes"];
}

function mergeClip(base: Clip, patch: ClipPatch): Clip {
  const next: Clip = {
    ...base,
    lastModifiedBy: "user",
    lastModifiedAt: Date.now(),
  };

  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) throw new Error("片段名称不能为空");
    next.name = trimmed;
  }
  if (patch.startInFrames !== undefined) next.startInFrames = patch.startInFrames;
  if (patch.durationInFrames !== undefined) {
    next.durationInFrames = patch.durationInFrames;
  }

  if (patch.source) {
    next.source = { ...(base.source ?? {}), ...patch.source };
  }
  if (patch.style) {
    next.style = { ...(base.style ?? {}), ...patch.style };
  }
  if (patch.transform) {
    const baseTransform = base.transform ?? {};
    next.transform = {
      ...baseTransform,
      ...patch.transform,
      position: {
        ...(baseTransform.position ?? {}),
        ...(patch.transform.position ?? {}),
      },
    };
  }
  if (patch.animations) {
    const baseAnimations = base.animations ?? {};
    next.animations = {
      ...baseAnimations,
      ...patch.animations,
      in: {
        ...(baseAnimations.in ?? {}),
        ...(patch.animations.in ?? {}),
      },
      out: {
        ...(baseAnimations.out ?? {}),
        ...(patch.animations.out ?? {}),
      },
    };
  }
  if (patch.keyframes !== undefined) {
    next.keyframes = patch.keyframes;
  }

  return next;
}

function replaceClipOnTrack(
  track: Track,
  clipTrackId: string,
  clipId: string,
  nextClip: Clip,
): Track {
  if (track.id === clipTrackId) {
    return {
      ...track,
      clips: track.clips.map((c) => (c.id === clipId ? nextClip : c)),
    };
  }
  if (track.children?.length) {
    return {
      ...track,
      children: track.children.map((child) =>
        replaceClipOnTrack(child, clipTrackId, clipId, nextClip),
      ),
    };
  }
  return track;
}

export function updateClip(
  timeline: Timeline,
  clipId: string,
  patch: ClipPatch,
): Timeline {
  const located = findLayerTrackForClip(timeline, clipId);
  if (!located) throw new Error("片段不存在");
  const parentGroup = findParentGroup(timeline, located.clipTrack.id);
  if (
    located.layerTrack.locked ||
    located.clipTrack.locked ||
    parentGroup?.locked
  ) {
    throw new Error("轨道已锁定");
  }

  let nextClip = mergeClip(located.clip, patch);

  const start = clampClipStart(
    nextClip.startInFrames,
    nextClip.durationInFrames,
    timeline.durationInFrames,
  );
  const duration = clampClipDuration(
    nextClip.durationInFrames,
    start,
    timeline.durationInFrames,
  );
  nextClip = { ...nextClip, startInFrames: start, durationInFrames: duration };

  const candidate = getClipRange(nextClip);
  if (hasOverlapOnTrack(located.clipTrack, candidate, clipId)) {
    throw new Error("与同轨道其它片段重叠");
  }

  const tracks = timeline.tracks.map((track) =>
    replaceClipOnTrack(track, located.clipTrack.id, clipId, nextClip),
  );

  return withValidated({ ...timeline, tracks });
}

export function getSortedTracks(timeline: Timeline): Track[] {
  return sortTracksByOrder(timeline.tracks);
}

function clampMarkerFrame(timeline: Timeline, frame: number): number {
  return Math.min(timeline.durationInFrames, Math.max(0, Math.round(frame)));
}

export function addMarker(
  timeline: Timeline,
  frame: number,
  name?: string,
): Timeline {
  const clamped = clampMarkerFrame(timeline, frame);
  const markers = normalizeMarkers(timeline.markers);
  if (findMarkerAtFrame({ ...timeline, markers }, clamped, 0)) {
    throw new Error("该位置已有标记点");
  }
  const marker: TimelineMarker = {
    id: newMarkerId(),
    frame: clamped,
    name: name?.trim() || defaultMarkerName(clamped, timeline.fps),
  };
  return withValidated({
    ...timeline,
    markers: [...markers, marker].sort((a, b) => a.frame - b.frame),
  });
}

export function removeMarker(timeline: Timeline, markerId: string): Timeline {
  const markers = normalizeMarkers(timeline.markers);
  const next = markers.filter((m) => m.id !== markerId);
  if (next.length === markers.length) throw new Error("标记点不存在");
  return withValidated({ ...timeline, markers: next });
}

/** 播放头位置已有标记则删除，否则添加 */
export function toggleMarkerAtFrame(timeline: Timeline, frame: number): Timeline {
  const clamped = clampMarkerFrame(timeline, frame);
  const markers = normalizeMarkers(timeline.markers);
  const existing = findMarkerAtFrame({ ...timeline, markers }, clamped, 0);
  if (existing) {
    return withValidated({
      ...timeline,
      markers: markers.filter((m) => m.id !== existing.id),
    });
  }
  return addMarker(timeline, clamped);
}

export function replaceClip(
  timeline: Timeline,
  clipId: string,
  nextClip: Clip,
): Timeline {
  const located = findLayerTrackForClip(timeline, clipId);
  if (!located) throw new Error("片段不存在");
  const parentGroup = findParentGroup(timeline, located.clipTrack.id);
  if (
    located.layerTrack.locked ||
    located.clipTrack.locked ||
    parentGroup?.locked
  ) {
    throw new Error("轨道已锁定");
  }

  const start = clampClipStart(
    nextClip.startInFrames,
    nextClip.durationInFrames,
    timeline.durationInFrames,
  );
  const duration = clampClipDuration(
    nextClip.durationInFrames,
    start,
    timeline.durationInFrames,
  );
  const normalized: Clip = {
    ...nextClip,
    startInFrames: start,
    durationInFrames: duration,
  };

  if (
    hasOverlapOnTrack(
      located.clipTrack,
      getClipRange(normalized),
      clipId,
    )
  ) {
    throw new Error("片段与其他片段重叠");
  }

  assertValidTimeline({
    ...timeline,
    tracks: timeline.tracks.map((track) =>
      replaceClipOnTrack(track, located.clipTrack.id, clipId, normalized),
    ),
  });

  return withValidated({
    ...timeline,
    tracks: timeline.tracks.map((track) =>
      replaceClipOnTrack(track, located.clipTrack.id, clipId, normalized),
    ),
  });
}
