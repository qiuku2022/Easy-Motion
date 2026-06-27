import { useMemo } from "react";
import { useVideoConfig } from "remotion";
import { resolveLayerScreenPosition } from "../lib/timeline-coordinates";

export function useLayerScreenPosition(x: number, y: number) {
  const { height } = useVideoConfig();
  return useMemo(
    () => resolveLayerScreenPosition(x, y, height),
    [x, y, height],
  );
}
