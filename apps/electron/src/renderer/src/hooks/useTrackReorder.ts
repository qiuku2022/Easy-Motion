import { useCallback, useState } from "react";
import { TRACK_ROW_HEIGHT } from "@/lib/timeline/constants";import { useTimelineStore } from "@/stores/timelineStore";

export interface TrackReorderPreview {
  trackId: string;
  insertIndex: number;
}

function reorderTrackIds(
  trackIds: string[],
  trackId: string,
  insertBeforeIndex: number,
): string[] {
  const from = trackIds.indexOf(trackId);
  if (from < 0) return trackIds;

  const next = [...trackIds];
  next.splice(from, 1);

  let to = insertBeforeIndex;
  if (from < to) to -= 1;
  to = Math.min(next.length, Math.max(0, to));
  next.splice(to, 0, trackId);
  return next;
}

export function useTrackReorder(
  sortedTrackIds: string[],
  containerRef: React.RefObject<HTMLElement | null>,
) {
  const [preview, setPreview] = useState<TrackReorderPreview | null>(null);
  const reorderTracks = useTimelineStore((s) => s.reorderTracks);

  const computeInsertIndex = useCallback(
    (clientY: number): number => {
      const el = containerRef.current;
      if (!el) return 0;
      const headers = [
        ...el.querySelectorAll<HTMLElement>(
          '[data-track-header-id][data-top-level="true"]',
        ),
      ];
      if (headers.length === 0) return 0;
      let insertIndex = headers.length;
      for (let i = 0; i < headers.length; i++) {
        const rect = headers[i]!.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if (clientY < mid) {
          insertIndex = i;
          break;
        }
      }
      return insertIndex;
    },
    [containerRef],
  );

  const startReorder = useCallback(
    (e: React.PointerEvent, trackId: string) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const startIndex = sortedTrackIds.indexOf(trackId);
      if (startIndex < 0) return;

      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      setPreview({ trackId, insertIndex: startIndex });

      const onMove = (ev: PointerEvent) => {
        setPreview({
          trackId,
          insertIndex: computeInsertIndex(ev.clientY),
        });
      };

      const onUp = (ev: PointerEvent) => {
        try {
          target.releasePointerCapture(ev.pointerId);
        } catch {
          /* pointer already released */
        }
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);

        const insertIndex = computeInsertIndex(ev.clientY);
        setPreview(null);

        const next = reorderTrackIds(sortedTrackIds, trackId, insertIndex);
        if (next.join("|") !== sortedTrackIds.join("|")) {
          reorderTracks(next);
        }
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [sortedTrackIds, computeInsertIndex, reorderTracks],
  );

  return { preview, startReorder };
}
