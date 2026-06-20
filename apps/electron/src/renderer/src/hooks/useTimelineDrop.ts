import { useCallback } from "react";
import { toast } from "sonner";
import { isAssetDrag, readAssetDragData } from "@/lib/timeline/assetDrag";
import { frameFromPointer } from "@/lib/timeline/pointerFrame";
import { isPresetDrag, readPresetDragData } from "@/lib/timeline/presetDrag";
import { trackIdFromPointer } from "@/lib/timeline/trackFromPointer";
import type { TimelineRow } from "@/lib/timeline/trackTree";
import { usePresetStore } from "@/stores/presetStore";
import { useTimelineStore } from "@/stores/timelineStore";

export function useTimelineDrop(
  bodyScrollRef: React.RefObject<HTMLElement | null>,
  rows: TimelineRow[],
  pxPerFrame: number,
) {
  const placeAssetAtFrame = useTimelineStore((s) => s.placeAssetAtFrame);
  const placePresetAtFrame = useTimelineStore((s) => s.placePresetAtFrame);
  const clearError = useTimelineStore((s) => s.clearError);

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!isAssetDrag(e.dataTransfer) && !isPresetDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      const container = bodyScrollRef.current;
      if (!container) return;

      const frame = frameFromPointer(e.clientX, container, pxPerFrame, 0);
      const trackId = trackIdFromPointer(e.clientY, container, rows);

      const assetPayload = readAssetDragData(e.dataTransfer);
      if (assetPayload) {
        e.preventDefault();
        clearError();
        placeAssetAtFrame(assetPayload.assetId, frame, trackId);
        return;
      }

      const presetPayload = readPresetDragData(e.dataTransfer);
      if (!presetPayload) return;

      e.preventDefault();
      clearError();
      const ok = placePresetAtFrame(presetPayload.presetId, frame, trackId);
      if (ok) {
        const preset = usePresetStore
          .getState()
          .getPresetById(presetPayload.presetId);
        if (preset) {
          toast.success(`已添加预设：${preset.name}`);
        }
      }
    },
    [
      bodyScrollRef,
      clearError,
      placeAssetAtFrame,
      placePresetAtFrame,
      pxPerFrame,
      rows,
    ],
  );

  return { onDragOver, onDrop };
}
