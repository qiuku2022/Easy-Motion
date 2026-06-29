import type { SpeedHandleSide } from "@/lib/timeline/graph-editor/speedGraphHandles";
import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

export interface SpeedHandleArmProps {
  side: SpeedHandleSide;
  anchorX: number;
  anchorY: number;
  /** 影响臂端点 X（水平，与 anchor 同 Y） */
  influenceX: number;
  /** 圆点 Y：默认同 anchorY；调 speed 后可偏离 */
  dotY: number;
  disabled?: boolean;
  onDrag: (clientX: number, clientY: number) => void;
}

/** AE 速度图方向手柄：水平 influence 臂 + 端点圆点 */
export function SpeedHandleArm({
  side,
  anchorX,
  anchorY,
  influenceX,
  dotY,
  disabled,
  onDrag,
}: SpeedHandleArmProps) {
  const dragging = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    const onMove = (ev: PointerEvent) => {
      if (!dragging.current) return;
      onDrag(ev.clientX, ev.clientY);
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const dotX = influenceX;
  const showSpeedStem = Math.abs(dotY - anchorY) > 1.5;

  return (
    <g className="pointer-events-auto text-amber-400/90">
      <line
        x1={anchorX}
        y1={anchorY}
        x2={influenceX}
        y2={anchorY}
        stroke="currentColor"
        strokeWidth={1}
        strokeDasharray="3 2"
        className="opacity-80"
      />
      {showSpeedStem && (
        <line
          x1={dotX}
          y1={anchorY}
          x2={dotX}
          y2={dotY}
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="2 2"
          className="opacity-60"
        />
      )}
      <circle
        cx={dotX}
        cy={dotY}
        r={4}
        className={cn(
          "fill-amber-400 stroke-amber-200/80 stroke-[1.5]",
          !disabled && "cursor-grab",
        )}
        onPointerDown={onPointerDown}
      />
      <title>
        {side === "incoming" ? "传入手柄" : "传出手柄"}：左右=影响，上下=速度
      </title>
    </g>
  );
}

interface SpeedGraphHandlesProps {
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  incoming?: { influenceX: number; dotY: number };
  outgoing?: { influenceX: number; dotY: number };
  disabled?: boolean;
  onDragIncoming?: (clientX: number, clientY: number) => void;
  onDragOutgoing?: (clientX: number, clientY: number) => void;
}

export function SpeedGraphHandles({
  width,
  height,
  anchorX,
  anchorY,
  incoming,
  outgoing,
  disabled,
  onDragIncoming,
  onDragOutgoing,
}: SpeedGraphHandlesProps) {
  const dragIncoming = useCallback(
    (clientX: number, clientY: number) => {
      onDragIncoming?.(clientX, clientY);
    },
    [onDragIncoming],
  );

  const dragOutgoing = useCallback(
    (clientX: number, clientY: number) => {
      onDragOutgoing?.(clientX, clientY);
    },
    [onDragOutgoing],
  );

  return (
    <svg
      className="pointer-events-none absolute inset-0 overflow-visible"
      width={width}
      height={height}
    >
      {incoming && onDragIncoming && (
        <SpeedHandleArm
          side="incoming"
          anchorX={anchorX}
          anchorY={anchorY}
          influenceX={incoming.influenceX}
          dotY={incoming.dotY}
          disabled={disabled}
          onDrag={dragIncoming}
        />
      )}
      {outgoing && onDragOutgoing && (
        <SpeedHandleArm
          side="outgoing"
          anchorX={anchorX}
          anchorY={anchorY}
          influenceX={outgoing.influenceX}
          dotY={outgoing.dotY}
          disabled={disabled}
          onDrag={dragOutgoing}
        />
      )}
    </svg>
  );
}

/** 值图仍用对角线臂（值空间贝塞尔切线） */
export interface GraphHandleDotProps {
  side: "incoming" | "outgoing";
  anchorX: number;
  anchorY: number;
  handleX: number;
  handleY: number;
  disabled?: boolean;
  onDrag: (x: number, y: number) => void;
}

export function GraphHandleDot({
  side,
  anchorX,
  anchorY,
  handleX,
  handleY,
  disabled,
  onDrag,
}: GraphHandleDotProps) {
  const dragging = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    const onMove = (ev: PointerEvent) => {
      if (!dragging.current) return;
      onDrag(ev.clientX, ev.clientY);
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <g className="pointer-events-auto">
      <line
        x1={anchorX}
        y1={anchorY}
        x2={handleX}
        y2={handleY}
        stroke="currentColor"
        strokeWidth={1}
        strokeDasharray="3 2"
        className="text-muted-foreground"
      />
      <circle
        cx={handleX}
        cy={handleY}
        r={4}
        className={cn(
          "fill-amber-400 stroke-amber-200",
          !disabled && "cursor-grab",
          side === "incoming" ? "stroke-[1.5]" : "stroke",
        )}
        onPointerDown={onPointerDown}
      />
    </g>
  );
}
