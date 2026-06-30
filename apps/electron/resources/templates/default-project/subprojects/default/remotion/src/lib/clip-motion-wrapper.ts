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

/** 时间线 Y（左下原点）→ CSS top */
export function timelineYToCssTop(y: number, compositionHeight: number): number {
  const height = Number(compositionHeight);
  if (!Number.isFinite(height) || height <= 0) return Math.round(y);
  const snapped = Math.round(y);
  return Math.min(height, Math.max(0, Math.round(height - snapped)));
}

export function resolveLayerScreenPosition(
  x: number,
  y: number,
  compositionHeight: number,
): { left: number; top: number } {
  return {
    left: Math.round(x),
    top: timelineYToCssTop(y, compositionHeight),
  };
}

/** fill 布局下相对画布中心的平移量（像素），避免 positioned 模式压扁全画布预设 */
export function resolveFillLayoutOffset(
  position: { x: number; y: number },
  canvas: CanvasSize,
): { x: number; y: number } {
  const screen = resolveLayerScreenPosition(position.x, position.y, canvas.height);
  const center = resolveLayerScreenPosition(
    canvas.width / 2,
    canvas.height / 2,
    canvas.height,
  );
  return {
    x: screen.left - center.left,
    y: screen.top - center.top,
  };
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

/** 预设/全画布片段始终 fill；位置通过平移实现，勿切 positioned（会与预设内置居中冲突导致变形） */
export function resolveClipTransformLayout(): "fill" {
  return "fill";
}
