import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

type Axis = "horizontal" | "vertical";

interface PanelResizerProps {
  axis: Axis;
  onResize: (delta: number) => void;
  className?: string;
}

export function PanelResizer({ axis, onResize, className }: PanelResizerProps) {
  const dragging = useRef(false);
  const lastPos = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      lastPos.current = axis === "horizontal" ? e.clientX : e.clientY;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [axis]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const pos = axis === "horizontal" ? e.clientX : e.clientY;
      const delta = pos - lastPos.current;
      lastPos.current = pos;
      onResize(delta);
    },
    [axis, onResize]
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  return (
    <div
      role="separator"
      aria-orientation={axis === "horizontal" ? "vertical" : "horizontal"}
      className={cn(
        "shrink-0 bg-border transition-colors duration-150 ease-out hover:bg-ring/50",
        axis === "horizontal" ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize",
        className
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  );
}
