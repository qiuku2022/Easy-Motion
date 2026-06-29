export type CanvasSize = { width: number; height: number };

export type ClipMotionInput = {
  transform?: {
    position?: { x?: number; y?: number };
    scale?: number;
    rotation?: number;
    opacity?: number;
  };
  keyframes?: Array<{ property: string }>;
  animations?: { in?: unknown };
};

function canvasCenter(canvas: CanvasSize) {
  return { x: canvas.width / 2, y: canvas.height / 2 };
}

/** 默认中心 transform 的预设组件应全画布渲染，不套定位 wrapper */
export function shouldWrapClipMotion(
  clip: ClipMotionInput,
  canvas: CanvasSize,
): boolean {
  if ((clip.keyframes?.length ?? 0) > 0) return true;
  if (clip.animations?.in != null) return true;
  const t = clip.transform;
  if (!t) return false;

  const center = canvasCenter(canvas);
  const pos = t.position;
  if (pos != null && (pos.x !== center.x || pos.y !== center.y)) return true;
  if ((t.scale ?? 1) !== 1) return true;
  if ((t.rotation ?? 0) !== 0) return true;
  if ((t.opacity ?? 1) !== 1) return true;
  return false;
}

export function resolveClipTransformLayout(
  transform: ClipMotionInput["transform"],
  keyframes: ClipMotionInput["keyframes"],
  canvas: CanvasSize,
): "fill" | "positioned" {
  if (
    (keyframes ?? []).some((kf) => kf.property.startsWith("transform.position"))
  ) {
    return "positioned";
  }
  const pos = transform?.position;
  if (pos != null) {
    const center = canvasCenter(canvas);
    if (pos.x !== center.x || pos.y !== center.y) return "positioned";
  }
  return "fill";
}
