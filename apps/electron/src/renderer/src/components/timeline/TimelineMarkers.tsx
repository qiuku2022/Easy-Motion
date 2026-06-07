import { Flag } from "lucide-react";
import { frameToPx } from "@/lib/timeline/framePixels";
import { normalizeMarkers } from "@/lib/timeline/markers";
import { cn } from "@/lib/utils";
import type { Timeline } from "@/types/timeline";

interface TimelineMarkersProps {
  timeline: Timeline;
  pxPerFrame: number;
  selectedMarkerId: string | null;
  onSelect: (markerId: string, frame: number) => void;
  onRemove: (markerId: string) => void;
}

export function RulerMarkers({
  timeline,
  pxPerFrame,
  selectedMarkerId,
  onSelect,
  onRemove,
}: TimelineMarkersProps) {
  const markers = normalizeMarkers(timeline.markers);

  return (
    <>
      {markers.map((marker) => {
        const selected = marker.id === selectedMarkerId;
        return (
          <button
            key={marker.id}
            type="button"
            title={marker.name ?? `标记 ${marker.frame}`}
            aria-label={marker.name ?? `标记 帧 ${marker.frame}`}
            className={cn(
              "absolute top-0 z-20 -translate-x-1/2 cursor-pointer rounded-sm p-0.5 transition-colors duration-150 ease-out hover:bg-em-elevated",
              selected && "bg-em-accent/20",
            )}
            style={{ left: frameToPx(marker.frame, pxPerFrame) }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(marker.id, marker.frame);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove(marker.id);
            }}
          >
            <Flag
              className="h-3.5 w-3.5"
              style={{ color: marker.color ?? "#EAB308" }}
              fill="currentColor"
            />
          </button>
        );
      })}
    </>
  );
}

export function BodyMarkerLines({
  timeline,
  pxPerFrame,
  height,
  selectedMarkerId,
}: Pick<TimelineMarkersProps, "timeline" | "pxPerFrame" | "selectedMarkerId"> & {
  height: number;
}) {
  const markers = normalizeMarkers(timeline.markers);

  if (markers.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-[5]"
      style={{ width: "100%", height }}
      aria-hidden
    >
      {markers.map((marker) => (
        <div
          key={marker.id}
          className="absolute bottom-0 top-0"
          style={{ left: frameToPx(marker.frame, pxPerFrame) }}
        >
          <div
            className={cn(
              "h-full w-0 border-l border-dashed opacity-60",
              marker.id === selectedMarkerId
                ? "border-amber-400 opacity-90"
                : "border-amber-500/70",
            )}
          />
        </div>
      ))}
    </div>
  );
}
