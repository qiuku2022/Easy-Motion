import type { SpeedHandleSide } from "@/lib/timeline/graph-editor/speedGraphHandles";
import { SpeedHandleArm } from "./SpeedGraphHandles";

export interface SpeedGraphHandleBinding {
  keyframeId: string;
  anchorX: number;
  anchorY: number;
  emphasized?: boolean;
  incoming?: { influenceX: number; dotY: number };
  outgoing?: { influenceX: number; dotY: number };
}

interface SpeedGraphHandlesLayerProps {
  width: number;
  height: number;
  items: SpeedGraphHandleBinding[];
  onDragIncoming: (keyframeId: string, clientX: number, clientY: number) => void;
  onDragOutgoing: (keyframeId: string, clientX: number, clientY: number) => void;
}

/** 为每个 bezier 关键帧绘制速度图方向手柄（AE：段内所有相关关键帧均显示） */
export function SpeedGraphHandlesLayer({
  width,
  height,
  items,
  onDragIncoming,
  onDragOutgoing,
}: SpeedGraphHandlesLayerProps) {
  if (items.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 overflow-visible"
      width={width}
      height={height}
    >
      {items.map((item) => (
        <g
          key={item.keyframeId}
          className={item.emphasized ? "opacity-100" : "opacity-85"}
        >
          {item.incoming && (
            <SpeedHandleArm
              side={"incoming" satisfies SpeedHandleSide}
              anchorX={item.anchorX}
              anchorY={item.anchorY}
              influenceX={item.incoming.influenceX}
              dotY={item.incoming.dotY}
              onDrag={(cx, cy) => onDragIncoming(item.keyframeId, cx, cy)}
            />
          )}
          {item.outgoing && (
            <SpeedHandleArm
              side={"outgoing" satisfies SpeedHandleSide}
              anchorX={item.anchorX}
              anchorY={item.anchorY}
              influenceX={item.outgoing.influenceX}
              dotY={item.outgoing.dotY}
              onDrag={(cx, cy) => onDragOutgoing(item.keyframeId, cx, cy)}
            />
          )}
        </g>
      ))}
    </svg>
  );
}
