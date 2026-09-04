import { frameToPx } from "@/lib/timeline/framePixels";

interface PlayheadProps {
  currentFrame: number;
  pxPerFrame: number;
  height: number;
  onDragStart: (e: React.PointerEvent) => void;
}

export function Playhead({
  currentFrame,
  pxPerFrame,
  height,
  onDragStart,
}: PlayheadProps) {
  const left = frameToPx(currentFrame, pxPerFrame);

  return (
    <div
      className="pointer-events-none absolute top-0 z-40"
      style={{ left, height, width: 0 }}
    >
      <div
        className="pointer-events-auto absolute -left-[5px] top-0 h-0 w-0 cursor-ew-resize border-x-[5px] border-t-[9px] border-x-transparent border-t-accent-blue drop-shadow-[0_1px_3px_rgba(47,129,247,0.5)]"
        onPointerDown={onDragStart}
        aria-label="播放头"
        role="slider"
      />
      <div className="absolute bottom-0 top-2 w-0.5 -translate-x-1/2 bg-accent-blue shadow-[0_0_4px_rgba(47,129,247,0.6)]" />
    </div>
  );
}
