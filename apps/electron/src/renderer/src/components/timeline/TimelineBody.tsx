import { useCallback, useEffect, useRef } from "react";
import type { Clip, Track } from "@/types/timeline";
import { cn } from "@/lib/utils";
import {
  RULER_HEIGHT,
  TRACK_HEADER_WIDTH,
  TRACK_ROW_HEIGHT,
} from "@/lib/timeline/constants";
import { fitPxPerFrameToWidth } from "@/lib/timeline/framePixels";
import {
  clampScrollLeft,
  clampScrollTop,
  wheelScrollDelta,
  zoomTimelineAtPointer,
} from "@/lib/timeline/timelineWheel";
import { frameFromPointer } from "@/lib/timeline/pointerFrame";
import {
  buildTimelineRows,
  effectiveTrackState,
  findLayerTrackForClip,
  getLeafTracks,
  sortTracksForTimelineUi,
} from "@/lib/timeline/trackTree";
import { ClipBlock } from "@/components/timeline/ClipBlock";
import type { ClipDragMode, ClipDragPreview } from "@/components/timeline/clipDragTypes";
import { Playhead } from "@/components/timeline/Playhead";
import { ClipFloatingToolbar } from "@/components/timeline/ClipFloatingToolbar";
import { BodyMarkerLines } from "@/components/timeline/TimelineMarkers";
import { SnapGuides } from "@/components/timeline/SnapGuides";
import { TimelineRuler } from "@/components/timeline/TimelineRuler";
import { TrackHeader } from "@/components/timeline/TrackHeader";
import { useTimelineDrop } from "@/hooks/useTimelineDrop";
import { useClipDrag } from "@/hooks/useClipDrag";
import { useSeekFrame } from "@/hooks/useSeekFrame";
import { useTrackReorder } from "@/hooks/useTrackReorder";
import { useTimelineStore } from "@/stores/timelineStore";
import { useUiStore } from "@/stores/uiStore";

interface TimelineBodyProps {
  tracks: Track[];
  durationInFrames: number;
  fps: number;
  currentFrame: number;
  selectedClipId: string | null;
  selectedMarkerId: string | null;
  onSelectClip: (clipId: string) => void;
  onPointerDownCapture?: React.PointerEventHandler<HTMLDivElement>;
}

export function TimelineBody({
  tracks,
  durationInFrames,
  fps,
  currentFrame,
  selectedClipId,
  selectedMarkerId,
  onSelectClip,
  onPointerDownCapture,
}: TimelineBodyProps) {
  const wheelRootRef = useRef<HTMLDivElement>(null);
  const rulerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const syncingScrollRef = useRef(false);

  const pxPerFrame = useUiStore((s) => s.pxPerFrame);
  const fitTimelineNonce = useUiStore((s) => s.fitTimelineNonce);
  const setPxPerFrame = useUiStore((s) => s.setPxPerFrame);
  const setTimelineScrollX = useUiStore((s) => s.setTimelineScrollX);
  const seekFrame = useSeekFrame();
  const { dragPreview, snapGuides, startDrag, consumeClick } = useClipDrag({
    scrollRef: bodyScrollRef,
    tracks: getLeafTracks(tracks),
    pxPerFrame,
  });

  const rows = buildTimelineRows(tracks);
  const sortedTrackIds = sortTracksForTimelineUi(tracks).map((t) => t.id);
  const { preview: trackReorderPreview, startReorder } = useTrackReorder(
    sortedTrackIds,
    headerScrollRef,
  );

  const timeline = useTimelineStore((s) => s.timeline);
  const selectedTrackId = useTimelineStore((s) => s.selectedTrackId);
  const selectTrack = useTimelineStore((s) => s.selectTrack);
  const selectMarker = useTimelineStore((s) => s.selectMarker);
  const removeSelectedMarker = useTimelineStore((s) => s.removeSelectedMarker);
  const clearSelection = useTimelineStore((s) => s.clearSelection);
  const contentWidth = Math.max(1, durationInFrames * pxPerFrame);
  const bodyHeight = rows.length * TRACK_ROW_HEIGHT;
  const layoutKey = `${durationInFrames}:${rows.map((r) => `${r.track.id}:${r.track.collapsed ? 1 : 0}`).join(",")}`;

  const handleSeek = useCallback(
    (frame: number) => {
      seekFrame(frame);
    },
    [seekFrame],
  );

  const syncHorizontalScroll = useCallback(
    (scrollLeft: number) => {
      syncingScrollRef.current = true;
      if (rulerScrollRef.current) rulerScrollRef.current.scrollLeft = scrollLeft;
      if (bodyScrollRef.current) bodyScrollRef.current.scrollLeft = scrollLeft;
      setTimelineScrollX(scrollLeft);
      syncingScrollRef.current = false;
    },
    [setTimelineScrollX],
  );

  const syncVerticalScroll = useCallback((scrollTop: number) => {
    syncingScrollRef.current = true;
    if (headerScrollRef.current) headerScrollRef.current.scrollTop = scrollTop;
    if (bodyScrollRef.current) bodyScrollRef.current.scrollTop = scrollTop;
    syncingScrollRef.current = false;
  }, []);

  const fitTimelineToView = useCallback(() => {
    const el = bodyScrollRef.current;
    if (!el || durationInFrames <= 0) return;
    const fit = fitPxPerFrameToWidth(el.clientWidth, durationInFrames);
    useUiStore.setState({ timelineZoomManual: false });
    setPxPerFrame(fit);
    syncHorizontalScroll(0);
  }, [durationInFrames, setPxPerFrame, syncHorizontalScroll]);

  const onPlayheadDragStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const container = bodyScrollRef.current;
      if (!container) return;

      const move = (ev: PointerEvent) => {
        const frame = frameFromPointer(ev.clientX, container, pxPerFrame, 0);
        seekFrame(frame, { altKeyHeld: ev.altKey });
      };

      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      seekFrame(frameFromPointer(e.clientX, container, pxPerFrame, 0), {
        altKeyHeld: e.altKey,
      });
    },
    [seekFrame, pxPerFrame],
  );

  useEffect(() => {
    fitTimelineToView();
    const id = requestAnimationFrame(fitTimelineToView);
    return () => cancelAnimationFrame(id);
  }, [layoutKey, fitTimelineToView]);

  useEffect(() => {
    if (fitTimelineNonce === 0) return;
    fitTimelineToView();
  }, [fitTimelineNonce, fitTimelineToView]);

  useEffect(() => {
    const el = bodyScrollRef.current;
    if (!el) return;

    let resizeRaf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        const body = bodyScrollRef.current;
        if (!body) return;
        const { pxPerFrame: current, timelineZoomManual } = useUiStore.getState();
        if (timelineZoomManual) return;
        const timelineW = durationInFrames * current;
        if (timelineW < body.clientWidth - 2) {
          fitTimelineToView();
        }
      });
    });
    ro.observe(el);

    const onWheel = (e: WheelEvent) => {
      const body = bodyScrollRef.current;
      if (!body) return;

      if (e.cancelable) e.preventDefault();

      const delta = wheelScrollDelta(e);
      if (delta === 0) return;

      // PR：Alt/Option + 滚轮 → 时间线缩放（锚定指针位置）
      if (e.altKey) {
        const currentPx = useUiStore.getState().pxPerFrame;
        const result = zoomTimelineAtPointer(
          body,
          e.clientX,
          delta,
          durationInFrames,
          currentPx,
        );
        if (result) {
          useUiStore.setState({ timelineZoomManual: true });
          setPxPerFrame(result.pxPerFrame);
          syncHorizontalScroll(result.scrollLeft);
        }
        return;
      }

      // PR：Ctrl + 滚轮 → 轨道区上下滚动
      if (e.ctrlKey) {
        syncVerticalScroll(clampScrollTop(body, body.scrollTop + delta));
        return;
      }

      // PR：滚轮 → 左右平移时间线
      syncHorizontalScroll(clampScrollLeft(body, body.scrollLeft + delta));
    };

    const root = wheelRootRef.current ?? el;
    root.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => {
      cancelAnimationFrame(resizeRaf);
      ro.disconnect();
      root.removeEventListener("wheel", onWheel, { capture: true });
    };
  }, [
    durationInFrames,
    fitTimelineToView,
    setPxPerFrame,
    syncHorizontalScroll,
    syncVerticalScroll,
  ]);

  const { onDragOver: onTimelineDragOver, onDrop: onTimelineDrop } =
    useTimelineDrop(bodyScrollRef, rows, pxPerFrame);

  const handleSelectClip = useCallback(
    (clipId: string) => {
      if (consumeClick()) return;
      onSelectClip(clipId);
    },
    [consumeClick, onSelectClip],
  );

  return (
    <div
      ref={wheelRootRef}
      className="flex min-h-0 flex-1 overflow-hidden"
      onPointerDownCapture={onPointerDownCapture}
    >
      <div
        className="flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-border bg-background"
        style={{ width: TRACK_HEADER_WIDTH }}
      >
        <div
          className="shrink-0 border-b border-r border-border bg-muted/30"
          style={{ height: RULER_HEIGHT }}
        />
        <div
          ref={headerScrollRef}
          className="scrollbar-hidden min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
          onScroll={(e) => {
            if (syncingScrollRef.current) return;
            syncVerticalScroll(e.currentTarget.scrollTop);
          }}
        >
          {rows.map((row, rowIndex) => (
            <TrackHeader
              key={`${row.track.id}-${row.depth}`}
              track={row.track}
              rowIndex={rowIndex}
              depth={row.depth}
              parentGroup={row.parentGroup}
              isGroupHeader={row.isGroupHeader}
              className="border-b border-border"
              selected={selectedTrackId === row.track.id || selectedTrackId === row.parentGroup?.id}
              isDragging={trackReorderPreview?.trackId === row.track.id}
              showDropLineAbove={
                row.depth === 0 && trackReorderPreview?.insertIndex === rowIndex
              }
              showDropLineBelow={
                row.depth === 0 &&
                trackReorderPreview?.insertIndex === sortedTrackIds.length &&
                rowIndex === rows.filter((r) => r.depth === 0).length - 1
              }
              onSelect={() => selectTrack(row.track.id)}
              onReorderStart={
                row.depth === 0 ? (e) => startReorder(e, row.track.id) : undefined
              }
            />
          ))}
        </div>
      </div>

      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div
          ref={rulerScrollRef}
          className="scrollbar-hidden shrink-0 overflow-x-auto overflow-y-hidden"
          onScroll={(e) => {
            if (syncingScrollRef.current) return;
            syncHorizontalScroll(e.currentTarget.scrollLeft);
          }}
        >
          <TimelineRuler
            timeline={timeline}
            durationInFrames={durationInFrames}
            fps={fps}
            pxPerFrame={pxPerFrame}
            contentWidth={contentWidth}
            selectedMarkerId={selectedMarkerId}
            onSeek={handleSeek}
            onSelectMarker={(markerId, frame) => {
              selectMarker(markerId);
              handleSeek(frame);
            }}
            onRemoveMarker={(markerId) => {
              selectMarker(markerId);
              removeSelectedMarker();
            }}
          />
        </div>

        <div
          ref={bodyScrollRef}
          className="scrollbar-hidden relative min-h-0 flex-1 overflow-x-auto overflow-y-auto"
          onDragOver={onTimelineDragOver}
          onDrop={onTimelineDrop}
          onScroll={(e) => {
            if (syncingScrollRef.current) return;
            const { scrollLeft, scrollTop } = e.currentTarget;
            syncingScrollRef.current = true;
            if (rulerScrollRef.current) {
              rulerScrollRef.current.scrollLeft = scrollLeft;
            }
            if (headerScrollRef.current) {
              headerScrollRef.current.scrollTop = scrollTop;
            }
            setTimelineScrollX(scrollLeft);
            syncingScrollRef.current = false;
          }}
        >
          <div
            className="relative min-h-full bg-em-bg"
            style={{ width: contentWidth, height: bodyHeight }}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) clearSelection();
            }}
          >
            {rows.map((row) => (
              <TrackRow
                key={`${row.track.id}-${row.depth}`}
                track={row.track}
                parentGroup={row.parentGroup}
                isGroupHeader={row.isGroupHeader}
                pxPerFrame={pxPerFrame}
                selectedClipId={selectedClipId}
                dragPreview={dragPreview}
                onSelectClip={handleSelectClip}
                onDragStart={(e, clipId, mode) => startDrag(e, clipId, row.track.id, mode)}
              />
            ))}

            {timeline && (
              <BodyMarkerLines
                timeline={timeline}
                pxPerFrame={pxPerFrame}
                height={bodyHeight}
                selectedMarkerId={selectedMarkerId}
              />
            )}

            <SnapGuides
              guides={snapGuides}
              pxPerFrame={pxPerFrame}
              height={bodyHeight}
            />

            <ClipFloatingToolbar
              rows={rows}
              selectedClipId={selectedClipId}
              pxPerFrame={pxPerFrame}
              currentFrame={currentFrame}
              dragPreview={dragPreview}
            />

            <Playhead
              currentFrame={currentFrame}
              pxPerFrame={pxPerFrame}
              height={bodyHeight}
              onDragStart={onPlayheadDragStart}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackRow({
  track,
  parentGroup,
  isGroupHeader,
  pxPerFrame,
  selectedClipId,
  dragPreview,
  onSelectClip,
  onDragStart,
}: {
  track: Track;
  parentGroup: Track | null;
  isGroupHeader: boolean;
  pxPerFrame: number;
  selectedClipId: string | null;
  dragPreview: ClipDragPreview | null;
  onSelectClip: (id: string) => void;
  onDragStart: (e: React.PointerEvent, clipId: string, mode: ClipDragMode) => void;
}) {
  const timeline = useTimelineStore((s) => s.timeline);
  const { locked, visible } = effectiveTrackState(track, parentGroup, timeline);
  const isDropTarget =
    dragPreview !== null &&
    dragPreview.targetTrackId === track.id &&
    dragPreview.sourceTrackId !== track.id;
  const hasSelectedClip =
    !isGroupHeader && track.clips.some((clip) => clip.id === selectedClipId);

  return (
    <div
      data-track-id={isGroupHeader ? undefined : track.id}
      className={cn(
        "relative box-border border-b border-em-border",
        !visible && "opacity-40",
        locked && "bg-em-surface/20",
        isGroupHeader && "bg-em-surface/10",
        isDropTarget && "bg-em-teal/5",
        hasSelectedClip && "bg-primary/[0.07]",
      )}
      style={{ height: TRACK_ROW_HEIGHT }}
    >
      {!isGroupHeader &&
        track.clips.map((clip) => {
        const render = resolveClipRender(clip, track.id, dragPreview);
        if (!render.visible) return null;
        return (
          <ClipBlock
            key={clip.id}
            clip={render.clip}
            pxPerFrame={pxPerFrame}
            selected={clip.id === selectedClipId}
            disabled={locked}
            dragging={render.dragging}
            onSelect={() => onSelectClip(clip.id)}
            onDragStart={(e, mode) => onDragStart(e, clip.id, mode)}
          />
        );
        })}

      {!isGroupHeader &&
        dragPreview &&
        dragPreview.targetTrackId === track.id &&
        dragPreview.sourceTrackId !== track.id && (
          <CrossTrackGhost
            clipId={dragPreview.clipId}
            preview={dragPreview}
            pxPerFrame={pxPerFrame}
            selected={dragPreview.clipId === selectedClipId}
            onSelect={() => onSelectClip(dragPreview.clipId)}
            onDragStart={onDragStart}
          />
        )}
    </div>
  );
}

function resolveClipRender(
  clip: Clip,
  trackId: string,
  dragPreview: ClipDragPreview | null,
): { visible: boolean; clip: Clip; dragging: boolean } {
  if (!dragPreview || dragPreview.clipId !== clip.id) {
    return { visible: true, clip, dragging: false };
  }

  if (
    dragPreview.sourceTrackId === trackId &&
    dragPreview.targetTrackId !== trackId
  ) {
    return { visible: false, clip, dragging: false };
  }

  if (dragPreview.targetTrackId === trackId) {
    return {
      visible: true,
      dragging: true,
      clip: {
        ...clip,
        startInFrames: dragPreview.startInFrames,
        durationInFrames: dragPreview.durationInFrames,
      },
    };
  }

  return { visible: true, clip, dragging: false };
}

function CrossTrackGhost({
  clipId,
  preview,
  pxPerFrame,
  selected,
  onSelect,
  onDragStart,
}: {
  clipId: string;
  preview: ClipDragPreview;
  pxPerFrame: number;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.PointerEvent, clipId: string, mode: ClipDragMode) => void;
}) {
  const timeline = useTimelineStore((s) => s.timeline);
  const located = timeline ? findLayerTrackForClip(timeline, clipId) : null;
  const sourceClip = located?.clip;

  if (!sourceClip) return null;

  const clip: Clip = {
    ...sourceClip,
    startInFrames: preview.startInFrames,
    durationInFrames: preview.durationInFrames,
  };

  return (
    <ClipBlock
      clip={clip}
      pxPerFrame={pxPerFrame}
      selected={selected}
      disabled={false}
      dragging
      onSelect={onSelect}
      onDragStart={(e, mode) => onDragStart(e, clipId, mode)}
    />
  );
}
