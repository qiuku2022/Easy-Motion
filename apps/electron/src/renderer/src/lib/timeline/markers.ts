import type { Timeline, TimelineMarker } from "@/types/timeline";

export const DEFAULT_MARKER_COLOR = "#EAB308";

export function newMarkerId(): string {
  return `marker-${crypto.randomUUID().slice(0, 8)}`;
}

export function normalizeMarkers(markers: TimelineMarker[] | undefined): TimelineMarker[] {
  if (!Array.isArray(markers)) return [];
  return markers
    .filter(
      (m) =>
        m &&
        typeof m.id === "string" &&
        typeof m.frame === "number" &&
        Number.isFinite(m.frame),
    )
    .map((m) => ({
      id: m.id,
      frame: Math.round(m.frame),
      name: typeof m.name === "string" ? m.name : undefined,
      color: typeof m.color === "string" ? m.color : DEFAULT_MARKER_COLOR,
    }));
}

export function getMarkerFrames(timeline: Timeline): number[] {
  return normalizeMarkers(timeline.markers).map((m) => m.frame);
}

export function findMarkerAtFrame(
  timeline: Timeline,
  frame: number,
  tolerance = 0,
): TimelineMarker | null {
  const markers = normalizeMarkers(timeline.markers);
  return (
    markers.find((m) => Math.abs(m.frame - frame) <= tolerance) ?? null
  );
}

export function defaultMarkerName(frame: number, fps: number): string {
  const seconds = frame / fps;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const frames = frame % fps;
  if (mins > 0) {
    return `标记 ${mins}:${String(secs).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
  }
  return `标记 ${secs}:${String(frames).padStart(2, "0")}`;
}
