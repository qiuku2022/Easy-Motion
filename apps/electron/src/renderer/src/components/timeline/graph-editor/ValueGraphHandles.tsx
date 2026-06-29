import { valueHandlesForKeyframe } from "@/lib/timeline/graph-editor/bezierTangent";
import type { Keyframe } from "@/types/timeline";
import { GraphHandleDot } from "./SpeedGraphHandles";

interface ValueGraphHandlesProps {
  prev: Keyframe | null;
  kf: Keyframe;
  next: Keyframe | null;
  anchorX: number;
  anchorY: number;
  frameToX: (frame: number) => number;
  valueToY: (value: number) => number;
  disabled?: boolean;
  onDragIncoming?: (frame: number, value: number) => void;
  onDragOutgoing?: (frame: number, value: number) => void;
  frameFromClientX: (clientX: number) => number;
  valueFromClientY: (clientY: number) => number;
}

export function ValueGraphHandles({
  prev,
  kf,
  next,
  anchorX,
  anchorY,
  frameToX,
  valueToY,
  disabled,
  onDragIncoming,
  onDragOutgoing,
  frameFromClientX,
  valueFromClientY,
}: ValueGraphHandlesProps) {
  const handles = valueHandlesForKeyframe(prev, kf, next);
  if (!handles) return null;

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      {handles.incoming && onDragIncoming && (
        <GraphHandleDot
          side="incoming"
          anchorX={anchorX}
          anchorY={anchorY}
          handleX={frameToX(handles.incoming.frame)}
          handleY={valueToY(handles.incoming.value)}
          disabled={disabled}
          onDrag={(cx, cy) =>
            onDragIncoming(frameFromClientX(cx), valueFromClientY(cy))
          }
        />
      )}
      {handles.outgoing && onDragOutgoing && (
        <GraphHandleDot
          side="outgoing"
          anchorX={anchorX}
          anchorY={anchorY}
          handleX={frameToX(handles.outgoing.frame)}
          handleY={valueToY(handles.outgoing.value)}
          disabled={disabled}
          onDrag={(cx, cy) =>
            onDragOutgoing(frameFromClientX(cx), valueFromClientY(cy))
          }
        />
      )}
    </svg>
  );
}
