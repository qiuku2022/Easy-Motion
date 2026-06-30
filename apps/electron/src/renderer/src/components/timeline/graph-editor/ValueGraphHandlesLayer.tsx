import type { ValueGraphHandleBinding } from "@/lib/timeline/graph-editor/valueGraphHandleBindings";
import { GraphHandleDot } from "./SpeedGraphHandles";

interface ValueGraphHandlesLayerProps {
  width: number;
  height: number;
  items: ValueGraphHandleBinding[];
  frameToX: (frame: number) => number;
  valueToY: (value: number) => number;
  onDragIncoming: (keyframeId: string, frame: number, value: number) => void;
  onDragOutgoing: (keyframeId: string, frame: number, value: number) => void;
  frameFromClientX: (clientX: number) => number;
  valueFromClientY: (clientY: number) => number;
}

export function ValueGraphHandlesLayer({
  width,
  height,
  items,
  frameToX,
  valueToY,
  onDragIncoming,
  onDragOutgoing,
  frameFromClientX,
  valueFromClientY,
}: ValueGraphHandlesLayerProps) {
  if (items.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 overflow-visible"
      width={width}
      height={height}
    >
      {items.map((item) => (
        <g key={item.keyframeId}>
          {item.incoming && (
            <GraphHandleDot
              side="incoming"
              anchorX={item.anchorX}
              anchorY={item.anchorY}
              handleX={frameToX(item.incoming.frame)}
              handleY={valueToY(item.incoming.value)}
              onDrag={(cx, cy) =>
                onDragIncoming(
                  item.keyframeId,
                  frameFromClientX(cx),
                  valueFromClientY(cy),
                )
              }
            />
          )}
          {item.outgoing && (
            <GraphHandleDot
              side="outgoing"
              anchorX={item.anchorX}
              anchorY={item.anchorY}
              handleX={frameToX(item.outgoing.frame)}
              handleY={valueToY(item.outgoing.value)}
              onDrag={(cx, cy) =>
                onDragOutgoing(
                  item.keyframeId,
                  frameFromClientX(cx),
                  valueFromClientY(cy),
                )
              }
            />
          )}
        </g>
      ))}
    </svg>
  );
}
