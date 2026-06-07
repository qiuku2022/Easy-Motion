import {
  defaultClipForTrackType,
  trackTypeNeedsDefaultClip,
} from "@/lib/timeline/defaultClips";
import { normalizeMarkers } from "@/lib/timeline/markers";
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
  let repaired = false;

  const tracks = timeline.tracks.map((track) => {
    if (track.type === "group") {
      let groupRepaired = false;
      const children = (track.children ?? []).map((child) => {
        const next = repairTrackContent(timeline, child);
        if (next !== child) groupRepaired = true;
        return next;
      });
      if (groupRepaired) {
        repaired = true;
        return { ...track, children };
      }
      return track;
    }

    const next = repairTrackContent(timeline, track);
    if (next !== track) repaired = true;
    return next;
  });

  const markers = normalizeMarkers(timeline.markers);
  const markersChanged =
    markers.length !== (timeline.markers?.length ?? 0) ||
    timeline.markers === undefined;

  if (!repaired && !markersChanged) return { timeline, repaired: false };

  const next = {
    ...timeline,
    tracks: repaired ? tracks : timeline.tracks,
    markers,
  };
  assertValidTimeline(next);
  return { timeline: next, repaired: true };
}
