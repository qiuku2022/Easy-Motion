import { useMemo } from "react";
import { frameToPx, clampFrame } from "@/lib/timeline/framePixels";
import { RULER_HEIGHT } from "@/lib/timeline/constants";
import {
  formatRulerLabel,
  getRulerTickIntervals,
} from "@/lib/timeline/rulerTicks";
import { RulerMarkers } from "@/components/timeline/TimelineMarkers";
import { WorkAreaRulerMarkers, WorkAreaRulerShade } from "@/components/timeline/WorkAreaOverlay";
import { cn } from "@/lib/utils";
import type { Timeline } from "@/types/timeline";

interface TimelineRulerProps {
  timeline: Timeline | null;
  durationInFrames: number;
  fps: number;
  pxPerFrame: number;
  contentWidth: number;
  selectedMarkerId: string | null;
  onSeek: (frame: number) => void;
  onSelectMarker: (markerId: string, frame: number) => void;
  onRemoveMarker: (markerId: string) => void;
  className?: string;
}

export function TimelineRuler({
  timeline,
  durationInFrames,
  fps,
  pxPerFrame,
  contentWidth,
  selectedMarkerId,
  onSeek,
  onSelectMarker,
  onRemoveMarker,
  className,
}: TimelineRulerProps) {
  const { majorFrames, minorFrames } = useMemo(
    () => getRulerTickIntervals(pxPerFrame, fps),
    [pxPerFrame, fps],
  );

  const ticks = useMemo(() => {
    const items: { frame: number; major: boolean }[] = [];
    for (let frame = 0; frame <= durationInFrames; frame += minorFrames) {
      items.push({ frame, major: frame % majorFrames === 0 });
    }
    return items;
  }, [durationInFrames, majorFrames, minorFrames]);

  const seekFromPointer = (clientX: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const frame = clampFrame(Math.round(x / pxPerFrame), durationInFrames);
    onSeek(frame);
  };

  return (
    <div
      role="slider"
      aria-label="时间线标尺"
      aria-valuemin={0}
      aria-valuemax={Math.max(0, durationInFrames - 1)}
      className={cn(
        "relative shrink-0 cursor-pointer select-none border-b border-em-border bg-em-surface/50",
        className,
      )}
      style={{ width: contentWidth, height: RULER_HEIGHT }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        const el = e.currentTarget;
        seekFromPointer(e.clientX, el);
        el.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        seekFromPointer(e.clientX, e.currentTarget);
      }}
      onPointerUp={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      }}
    >
      {ticks.map(({ frame, major }) => (
        <div
          key={frame}
          className="pointer-events-none absolute bottom-0 top-0"
          style={{ left: frameToPx(frame, pxPerFrame) }}
        >
          <div
            className={cn(
              "absolute bottom-0 w-px bg-em-border",
              major ? "h-full" : "h-2",
            )}
          />
          {major && (
            <span className="absolute left-0.5 top-0.5 font-mono text-[10px] text-em-muted">
              {formatRulerLabel(frame, fps, majorFrames)}
            </span>
          )}
        </div>
      ))}

      {timeline ? (
        <WorkAreaRulerShade
          timeline={timeline}
          durationInFrames={durationInFrames}
          pxPerFrame={pxPerFrame}
        />
      ) : null}

      {timeline && (
        <>
          <WorkAreaRulerMarkers timeline={timeline} pxPerFrame={pxPerFrame} />
          <RulerMarkers
            timeline={timeline}
            pxPerFrame={pxPerFrame}
            selectedMarkerId={selectedMarkerId}
            onSelect={onSelectMarker}
            onRemove={onRemoveMarker}
          />
        </>
      )}
    </div>
  );
}
