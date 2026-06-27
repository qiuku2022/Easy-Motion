/** 时间线位置：左下角 (0,0)，Y 向上；渲染时转为 CSS top-left */

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
