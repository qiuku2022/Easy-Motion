import { useCallback } from "react";
import { TRACK_ROW_HEIGHT } from "@/lib/timeline/constants";
import { frameFromPointer } from "@/lib/timeline/pointerFrame";
import { isAssetDrag, readAssetDragData } from "@/lib/timeline/assetDrag";
import type { Track } from "@/types/timeline";
import { useTimelineStore } from "@/stores/timelineStore";

export function useAssetDrop(
  bodyScrollRef: React.RefObject<HTMLElement | null>,
  sortedTracks: Track[],
  pxPerFrame: number,
) {
  const placeAssetAtFrame = useTimelineStore((s) => s.placeAssetAtFrame);
  const clearError = useTimelineStore((s) => s.clearError);

  const trackIdFromPointer = useCallback(
    (clientY: number, container: HTMLElement) => {
      const rect = container.getBoundingClientRect();
      const y = clientY - rect.top + container.scrollTop;
      const row = Math.floor(y / TRACK_ROW_HEIGHT);
      if (row < 0 || row >= sortedTracks.length) return null;
      return sortedTracks[row]?.id ?? null;
    },
    [sortedTracks],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!isAssetDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      const payload = readAssetDragData(e.dataTransfer);
      if (!payload) return;
      e.preventDefault();

      const container = bodyScrollRef.current;
      if (!container) return;

      clearError();
      const frame = frameFromPointer(e.clientX, container, pxPerFrame, 0);
      const trackId = trackIdFromPointer(e.clientY, container);
      placeAssetAtFrame(payload.assetId, frame, trackId);
    },
    [
      bodyScrollRef,
      clearError,
      placeAssetAtFrame,
      pxPerFrame,
      trackIdFromPointer,
    ],
  );

  return { onDragOver, onDrop };
}
