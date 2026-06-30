import { frameBoundaryPx, frameToPx } from "@/lib/timeline/framePixels";
import { resolveWorkAreaDisplayRange } from "@/lib/timeline/workArea";
import { cn } from "@/lib/utils";
import type { Timeline } from "@/types/timeline";

const SHADE_CLASS = "bg-zinc-950/55";

function useWorkAreaBounds(
  timeline: Timeline,
  durationInFrames: number,
  pxPerFrame: number,
) {
  const { inFrame, outFrame, custom } = resolveWorkAreaDisplayRange(timeline);
  const width = frameToPx(durationInFrames, pxPerFrame);
  const inPx = frameBoundaryPx(inFrame, pxPerFrame, "start");
  const outEndPx = frameBoundaryPx(outFrame, pxPerFrame, "end");
  const hasLeftShade = inPx > 0;
  const hasRightShade = outEndPx < width;

  return {
    inFrame,
    outFrame,
    custom,
    width,
    inPx,
    outEndPx,
    hasShade: hasLeftShade || hasRightShade,
    hasLeftShade,
    hasRightShade,
  };
}

function WorkAreaShadeMask({
  inPx,
  outEndPx,
  width,
  height: _height,
  className,
}: {
  inPx: number;
  outEndPx: number;
  width: number;
  height: number | string;
  className?: string;
}) {
  const hasLeft = inPx > 0;
  const hasRight = outEndPx < width;
  if (!hasLeft && !hasRight) return null;

  return (
    <>
      {hasLeft ? (
        <div
          className={cn("absolute bottom-0 top-0", SHADE_CLASS, className)}
          style={{ left: 0, width: inPx }}
        />
      ) : null}
      {hasRight ? (
        <div
          className={cn("absolute bottom-0 top-0", SHADE_CLASS, className)}
          style={{ left: outEndPx, width: width - outEndPx }}
        />
      ) : null}
    </>
  );
}

function BoundaryLine({
  left,
  height,
  title,
}: {
  left: number;
  height: number | string;
  title: string;
}) {
  return (
    <div
      className="pointer-events-none absolute bottom-0 top-0 z-[22]"
      style={{ left, height }}
      title={title}
    >
      <div className="absolute bottom-0 top-0 w-px -translate-x-1/2 bg-amber-400/90" />
    </div>
  );
}

function BoundaryBadge({
  left,
  label,
}: {
  left: number;
  label: "I" | "O";
}) {
  return (
    <div className="pointer-events-none absolute top-0 z-[23]" style={{ left }}>
      <span className="absolute top-0 -translate-x-1/2 rounded bg-amber-500/90 px-1 font-mono text-[9px] font-semibold text-black">
        {label}
      </span>
    </div>
  );
}

interface WorkAreaOverlayProps {
  timeline: Timeline;
  durationInFrames: number;
  pxPerFrame: number;
  height: number;
  className?: string;
}

/** PR 风格 I/O 区域：IO 外侧半透明暗遮罩 + 入点/出点竖线 */
export function WorkAreaOverlay({
  timeline,
  durationInFrames,
  pxPerFrame,
  height,
  className,
}: WorkAreaOverlayProps) {
  const { inFrame, outFrame, custom, width, inPx, outEndPx, hasShade } =
    useWorkAreaBounds(timeline, durationInFrames, pxPerFrame);

  return (
    <div
      className={cn("pointer-events-none absolute inset-0 z-[25]", className)}
      style={{ width, height }}
      aria-hidden
    >
      {hasShade ? (
        <WorkAreaShadeMask
          inPx={inPx}
          outEndPx={outEndPx}
          width={width}
          height={height}
        />
      ) : null}

      {custom ? (
        <BoundaryLine
          left={inPx}
          height={height}
          title={`入点 f${inFrame}`}
        />
      ) : null}
      {custom || outEndPx < width ? (
        <BoundaryLine
          left={outEndPx}
          height={height}
          title={`出点 f${outFrame}`}
        />
      ) : null}
    </div>
  );
}

interface WorkAreaRulerShadeProps {
  timeline: Timeline;
  durationInFrames: number;
  pxPerFrame: number;
}

/** 标尺上 IO 外侧暗遮罩（与轨道区一致） */
export function WorkAreaRulerShade({
  timeline,
  durationInFrames,
  pxPerFrame,
}: WorkAreaRulerShadeProps) {
  const { width, inPx, outEndPx, hasShade } = useWorkAreaBounds(
    timeline,
    durationInFrames,
    pxPerFrame,
  );

  if (!hasShade) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[10]" aria-hidden>
      <WorkAreaShadeMask
        inPx={inPx}
        outEndPx={outEndPx}
        width={width}
        height="100%"
      />
    </div>
  );
}

interface WorkAreaRulerMarkersProps {
  timeline: Timeline;
  pxPerFrame: number;
}

export function WorkAreaRulerMarkers({ timeline, pxPerFrame }: WorkAreaRulerMarkersProps) {
  const { inFrame, outFrame, custom } = resolveWorkAreaDisplayRange(timeline);
  const maxFrame = Math.max(0, timeline.durationInFrames - 1);
  const inPx = frameBoundaryPx(inFrame, pxPerFrame, "start");
  const outPx = frameBoundaryPx(outFrame, pxPerFrame, "end");

  const showInLine = custom;
  const showOutLine = custom || outFrame < maxFrame;

  return (
    <>
      {showInLine ? (
        <BoundaryLine left={inPx} height="100%" title={`入点 f${inFrame}`} />
      ) : null}
      {showOutLine ? (
        <BoundaryLine left={outPx} height="100%" title={`出点 f${outFrame}`} />
      ) : null}
      {custom ? (
        <>
          <BoundaryBadge left={inPx} label="I" />
          <BoundaryBadge left={outPx} label="O" />
        </>
      ) : null}
    </>
  );
}
