import type { Timeline, Track } from "@/types/timeline";

export function collectSoloTrackIds(tracks: Track[]): Set<string> {
  const ids = new Set<string>();
  for (const track of tracks) {
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

export function hasActiveSolo(timeline: Timeline | null | undefined): boolean {
  if (!timeline) return false;
  return collectSoloTrackIds(timeline.tracks).size > 0;
}

export function isTrackIncludedInPreview(
  track: Track,
  parentGroup: Track | null,
  tracks: Track[],
): boolean {
  if (!track.visible) return false;
  if (parentGroup && !parentGroup.visible) return false;
  if (!hasActiveSolo({ tracks } as Timeline)) return true;
  return collectSoloTrackIds(tracks).has(track.id);
}
