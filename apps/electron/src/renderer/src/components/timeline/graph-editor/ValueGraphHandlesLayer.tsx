import type { Keyframe } from "@/types/timeline";
import { valueHandlesForKeyframe } from "@/lib/timeline/graph-editor/bezierTangent";
import { GraphHandleDot } from "./SpeedGraphHandles";

export interface ValueGraphHandleBinding {
  keyframeId: string;
  anchorX: number;
  anchorY: number;
  incoming?: { frame: number; value: number };
  outgoing?: { frame: number; value: number };
}

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

export function buildValueGraphHandleBindings(
  keyframes: Keyframe[],
  frameToX: (frame: number) => number,
  valueToY: (value: number) => number,
): ValueGraphHandleBinding[] {
  const bindings: ValueGraphHandleBinding[] = [];
  for (let i = 0; i < keyframes.length; i += 1) {
    const kf = keyframes[i]!;
    const prev = i > 0 ? keyframes[i - 1]! : null;
    const next = i < keyframes.length - 1 ? keyframes[i + 1]! : null;
    const handles = valueHandlesForKeyframe(prev, kf, next);
    if (!handles) continue;
    bindings.push({
      keyframeId: kf.id,
      anchorX: frameToX(kf.frame),
      anchorY: valueToY(Number(kf.value)),
      incoming: handles.incoming,
      outgoing: handles.outgoing,
    });
  }
  return bindings;
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
