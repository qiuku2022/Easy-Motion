import { useCallback, useRef, useState } from "react";
import type { ClipDragPreview, ClipDragMode } from "@/components/timeline/clipDragTypes";
import { clampMoveStart, findClipTrack } from "@/lib/timeline/clipCollision";
import { frameFromPointer } from "@/lib/timeline/pointerFrame";
import { snapClipEdge, snapClipMove, type SnapGuide } from "@/lib/timeline/snapClip";
import type { Track } from "@/types/timeline";
import { useTimelineStore } from "@/stores/timelineStore";
import { useUiStore } from "@/stores/uiStore";

const DRAG_THRESHOLD_PX = 3;

interface UseClipDragOptions {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  tracks: Track[];
  pxPerFrame: number;
}

function snapOptions(excludeClipId: string, pxPerFrame: number) {
  const timeline = useTimelineStore.getState().timeline!;
  const { snapEnabled, altKeyHeld } = useUiStore.getState();
  return {
    timeline,
    pxPerFrame,
    currentFrame: useTimelineStore.getState().currentFrame,
    snapEnabled,
    altKeyHeld,
    excludeClipId,
  };
}

export function useClipDrag({ scrollRef, tracks, pxPerFrame }: UseClipDragOptions) {
  const [dragPreview, setDragPreview] = useState<ClipDragPreview | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const suppressClickRef = useRef(false);

  const resolveTrackId = useCallback(
    (clientX: number, clientY: number, fallbackTrackId: string, clipType: string) => {
      const el = document.elementFromPoint(clientX, clientY);
      const row = el?.closest<HTMLElement>("[data-track-id]");
      const trackId = row?.dataset.trackId;
      if (!trackId) return fallbackTrackId;
      const track = tracks.find((t) => t.id === trackId);
      if (!track || track.locked || track.type === "group") return fallbackTrackId;
      if (track.type !== clipType) return fallbackTrackId;
      return trackId;
    },
    [tracks],
  );

  const consumeClick = useCallback(() => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return true;
    }
    return false;
  }, []);

  const startDrag = useCallback(
    (e: React.PointerEvent, clipId: string, trackId: string, mode: ClipDragMode) => {
      e.preventDefault();
      e.stopPropagation();

      const timeline = useTimelineStore.getState().timeline;
      const container = scrollRef.current;
      if (!timeline || !container) return;

      const located = findClipTrack(timeline, clipId);
      if (!located) return;

      const { clip } = located;
      const originStart = clip.startInFrames;
      const originDuration = clip.durationInFrames;
      const originEnd = originStart + originDuration;
      const pointerFrame = frameFromPointer(e.clientX, container, pxPerFrame, 0);
      const grabOffsetFrames =
        mode === "move" ? pointerFrame - originStart : 0;

      let moved = false;
      let latestPreview: ClipDragPreview = {
        clipId,
        sourceTrackId: trackId,
        targetTrackId: trackId,
        startInFrames: originStart,
        durationInFrames: originDuration,
        mode,
      };

      setDragPreview(latestPreview);
      setSnapGuides([]);
      useTimelineStore.getState().selectClip(clipId);

      const move = (ev: PointerEvent) => {
        if (Math.abs(ev.clientX - e.clientX) > DRAG_THRESHOLD_PX) {
          moved = true;
        }

        const opts = snapOptions(clipId, pxPerFrame);
        const pointerAt = frameFromPointer(ev.clientX, container, pxPerFrame, 0);

        if (mode === "move") {
          const rawStart = pointerAt - grabOffsetFrames;
          const { startInFrames, guides } = snapClipMove(rawStart, originDuration, opts);
          const start = clampMoveStart(
            startInFrames,
            originDuration,
            timeline.durationInFrames,
          );
          const targetTrackId = resolveTrackId(
            ev.clientX,
            ev.clientY,
            trackId,
            clip.type,
          );
          latestPreview = {
            clipId,
            sourceTrackId: trackId,
            targetTrackId,
            startInFrames: start,
            durationInFrames: originDuration,
            mode,
          };
          setSnapGuides(guides);
        } else if (mode === "resize-left") {
          const { startInFrames, durationInFrames, guides } = snapClipEdge(
            "resize-left",
            pointerAt,
            originStart,
            originEnd,
            opts,
          );
          latestPreview = {
            clipId,
            sourceTrackId: trackId,
            targetTrackId: trackId,
            startInFrames,
            durationInFrames,
            mode,
          };
          setSnapGuides(guides);
        } else {
          const { startInFrames, durationInFrames, guides } = snapClipEdge(
            "resize-right",
            pointerAt,
            originStart,
            originEnd,
            opts,
          );
          latestPreview = {
            clipId,
            sourceTrackId: trackId,
            targetTrackId: trackId,
            startInFrames,
            durationInFrames,
            mode,
          };
          setSnapGuides(guides);
        }

        setDragPreview({ ...latestPreview });
      };

      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        setDragPreview(null);
        setSnapGuides([]);

        if (!moved) return;

        suppressClickRef.current = true;
        const store = useTimelineStore.getState();

        if (latestPreview.mode === "move") {
          store.moveClip(
            clipId,
            latestPreview.targetTrackId,
            latestPreview.startInFrames,
          );
        } else if (latestPreview.mode === "resize-left") {
          store.resizeClip(
            clipId,
            "left",
            latestPreview.startInFrames,
            latestPreview.durationInFrames,
          );
        } else {
          store.resizeClip(
            clipId,
            "right",
            latestPreview.startInFrames,
            latestPreview.durationInFrames,
          );
        }
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [pxPerFrame, resolveTrackId, scrollRef],
  );

  return { dragPreview, snapGuides, startDrag, consumeClick };
}
