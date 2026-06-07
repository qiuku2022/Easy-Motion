/** 时间线坐标：帧号 ↔ 像素（含视口滚动） */

export const DEFAULT_PX_PER_FRAME = 4;
export const MIN_PX_PER_FRAME = 1;
export const MAX_PX_PER_FRAME = 64;

export function clampPxPerFrame(pxPerFrame: number): number {
  return Math.min(MAX_PX_PER_FRAME, Math.max(MIN_PX_PER_FRAME, pxPerFrame));
}

/** 让整段 duration 铺满可视宽度（Premiere「适配窗口」） */
export function fitPxPerFrameToWidth(
  viewportWidthPx: number,
  durationInFrames: number,
): number {
  if (durationInFrames <= 0 || viewportWidthPx <= 0) {
    return DEFAULT_PX_PER_FRAME;
  }
  return clampPxPerFrame(viewportWidthPx / durationInFrames);
}

export function frameToPx(frame: number, pxPerFrame: number): number {
  return frame * pxPerFrame;
}

/** 内容区 X（不含轨道头）→ 帧号 */
export function pxToFrame(
  contentPx: number,
  pxPerFrame: number,
  scrollX = 0,
): number {
  const totalPx = contentPx + scrollX;
  return Math.round(totalPx / pxPerFrame);
}

export function clampFrame(frame: number, durationInFrames: number): number {
  const max = Math.max(0, durationInFrames - 1);
  return Math.min(max, Math.max(0, frame));
}

/** 吸附阈值：UI 像素 → 帧（随缩放变化） */
export function snapThresholdPxToFrames(thresholdPx: number, pxPerFrame: number): number {
  return Math.max(1, Math.round(thresholdPx / pxPerFrame));
}
