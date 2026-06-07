import type { Clip } from "@/types/timeline";

export const DEFAULT_TRANSFORM = {
  position: { x: 640, y: 360 },
  scale: 1,
  rotation: 0,
  opacity: 1,
} as const;

export function ensureTransform(
  transform: Clip["transform"] | undefined,
  canvas?: { width: number; height: number },
): {
  position: { x: number; y: number };
  scale: number;
  rotation: number;
  opacity: number;
} {
  const cx = canvas?.width ? canvas.width / 2 : DEFAULT_TRANSFORM.position.x;
  const cy = canvas?.height ? canvas.height / 2 : DEFAULT_TRANSFORM.position.y;
  return {
    position: {
      x: transform?.position?.x ?? cx,
      y: transform?.position?.y ?? cy,
    },
    scale: transform?.scale ?? DEFAULT_TRANSFORM.scale,
    rotation: transform?.rotation ?? DEFAULT_TRANSFORM.rotation,
    opacity: transform?.opacity ?? DEFAULT_TRANSFORM.opacity,
  };
}
