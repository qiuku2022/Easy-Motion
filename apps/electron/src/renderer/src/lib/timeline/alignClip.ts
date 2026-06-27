import { findClipTrack } from "@/lib/timeline/clipCollision";
import { assertValidTimeline } from "@/lib/timeline/validate";
import type { Timeline } from "@/types/timeline";

/** 将片段锚点在画布中水平居中（改 transform.position.x） */
export function alignClipHorizontalCenter(timeline: Timeline, clipId: string): Timeline {
  const located = findClipTrack(timeline, clipId);
  if (!located) throw new Error("片段不存在");
  if (located.track.locked) throw new Error("轨道已锁定");

  const centerX = timeline.width / 2;
  const transform = {
    ...(located.clip.transform ?? {}),
    position: {
      ...((located.clip.transform?.position as Record<string, number>) ?? {}),
      x: centerX,
    },
  };

  const tracks = timeline.tracks.map((track) => {
    if (track.id !== located.track.id) return track;
    return {
      ...track,
      clips: track.clips.map((c) =>
        c.id === clipId
          ? { ...c, transform, lastModifiedBy: "user" as const, lastModifiedAt: Date.now() }
          : c,
      ),
    };
  });

  const next = { ...timeline, tracks };
  assertValidTimeline(next);
  return next;
}
