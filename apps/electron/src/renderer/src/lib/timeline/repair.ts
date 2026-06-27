import {
  defaultClipForTrackType,
  trackTypeNeedsDefaultClip,
} from "@/lib/timeline/defaultClips";
import { normalizeMarkers } from "@/lib/timeline/markers";
import { migrateTimelineToBottomLeft } from "@/lib/timeline/coordinates";
import { assertValidTimeline } from "@/lib/timeline/validate";
import type { Timeline, Track } from "@/types/timeline";

function repairTrackContent(timeline: Timeline, track: Track): Track {
  if (!trackTypeNeedsDefaultClip(track.type) || track.clips.length > 0) {
    return track;
  }
  return {
    ...track,
    clips: [defaultClipForTrackType(timeline, track.type)],
  };
}

/** 修复历史项目中「有空轨道、无片段」导致属性面板无法编辑的问题 */
export function repairTimelineForEditing(timeline: Timeline): {
  timeline: Timeline;
  repaired: boolean;
} {
  const coordinateMigrated = migrateTimelineToBottomLeft(timeline);
  let working = coordinateMigrated.timeline;
  let repaired = coordinateMigrated.migrated;

  const tracks = working.tracks.map((track) => {
    if (track.type === "group") {
      let groupRepaired = false;
      const children = (track.children ?? []).map((child) => {
        const next = repairTrackContent(working, child);
        if (next !== child) groupRepaired = true;
        return next;
      });
      if (groupRepaired) {
        repaired = true;
        return { ...track, children };
      }
      return track;
    }

    const next = repairTrackContent(working, track);
    if (next !== track) repaired = true;
    return next;
  });

  const markers = normalizeMarkers(working.markers);
  const markersChanged =
    markers.length !== (working.markers?.length ?? 0) || working.markers === undefined;

  if (!repaired && !markersChanged) {
    return { timeline: working, repaired: coordinateMigrated.migrated };
  }

  const next = {
    ...working,
    tracks: repaired ? tracks : working.tracks,
    markers,
  };
  assertValidTimeline(next);
  return { timeline: next, repaired: true };
}
