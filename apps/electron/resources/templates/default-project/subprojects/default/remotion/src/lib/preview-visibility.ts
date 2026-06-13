/** 预览独奏/可见性/片段时长（与 packages/shared preview-visibility 逻辑一致） */

interface TimelineClip {
  id: string;
  startInFrames?: number;
  durationInFrames?: number;
}

interface TimelineLike {
  tracks?: Array<{
    id: string;
    type: string;
    visible?: boolean;
    solo?: boolean;
    clips?: TimelineClip[];
    children?: Array<{
      id: string;
      type: string;
      visible?: boolean;
      solo?: boolean;
      clips?: TimelineClip[];
    }>;
  }>;
}

function collectSoloTrackIds(tracks: TimelineLike["tracks"]): Set<string> {
  const ids = new Set<string>();
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

function hasActiveSolo(tracks: TimelineLike["tracks"]): boolean {
  return collectSoloTrackIds(tracks).size > 0;
}

function isTrackIncludedInPreview(
  track: NonNullable<TimelineLike["tracks"]>[number],
  parentGroup: NonNullable<TimelineLike["tracks"]>[number] | null,
  tracks: NonNullable<TimelineLike["tracks"]>,
): boolean {
  if (track.visible === false) return false;
  if (parentGroup && parentGroup.visible === false) return false;
  if (!hasActiveSolo(tracks)) return true;
  return collectSoloTrackIds(tracks).has(track.id);
}

function findClipTrackContext(tracks: TimelineLike["tracks"], clipId: string) {
  for (const track of tracks ?? []) {
    for (const clip of track.clips ?? []) {
      if (clip.id === clipId) {
        return { track, parent: null as typeof track | null, clip };
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

export function isClipVisibleInPreview(
  clipId: string,
  timeline?: TimelineLike | null,
): boolean {
  if (!timeline?.tracks) return true;
  const ctx = findClipTrackContext(timeline.tracks, clipId);
  if (!ctx) return true;
  return isTrackIncludedInPreview(ctx.track, ctx.parent, timeline.tracks);
}

export function getClipTimingForPreview(
  clipId: string,
  timeline?: TimelineLike | null,
): { startInFrames: number; durationInFrames: number } | null {
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
