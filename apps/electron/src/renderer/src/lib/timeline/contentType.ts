import type { Clip, Track, TrackType } from "@/types/timeline";
import { TRACK_TYPES } from "@/types/timeline";

export function isKnownTrackType(type: string): type is TrackType {
  return (TRACK_TYPES as readonly string[]).includes(type);
}

/** 片段内容类型：优先 clip.type，复合图层内子元素各自独立 */
export function resolveClipContentType(clip: Clip, track: Track): TrackType {
  if (isKnownTrackType(clip.type)) return clip.type;
  return track.type;
}

export function isCompositeLayerType(type: TrackType): boolean {
  return type === "group";
}

export function isContentEditableType(type: TrackType): boolean {
  return (
    type === "text" ||
    type === "image" ||
    type === "video" ||
    type === "audio" ||
    type === "shape" ||
    type === "chart"
  );
}
