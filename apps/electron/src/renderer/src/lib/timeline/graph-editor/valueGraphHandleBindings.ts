import type { Keyframe } from "@/types/timeline";
import { valueHandlesForKeyframe } from "@/lib/timeline/graph-editor/bezierTangent";

export interface ValueGraphHandleBinding {
  keyframeId: string;
  anchorX: number;
  anchorY: number;
  incoming?: { frame: number; value: number };
  outgoing?: { frame: number; value: number };
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
