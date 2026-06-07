import {
  clampPxPerFrame,
  pxToFrame,
} from "@/lib/timeline/framePixels";

const ZOOM_STEP = 0.5;

/** 滚轮主方向（触控板横滑优先用 deltaX） */
export function wheelScrollDelta(e: WheelEvent): number {
  return Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
}

/**
 * Premiere Pro：Alt/Option + 滚轮缩放，以指针下方时间位置为锚点
 */
export function zoomTimelineAtPointer(
  bodyEl: HTMLElement,
  clientX: number,
  deltaY: number,
  durationInFrames: number,
  currentPxPerFrame: number,
): { pxPerFrame: number; scrollLeft: number } | null {
  const zoomDelta = deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
  const nextPx = clampPxPerFrame(currentPxPerFrame + zoomDelta);
  if (nextPx === currentPxPerFrame) return null;

  const rect = bodyEl.getBoundingClientRect();
  const localX = Math.max(0, Math.min(rect.width, clientX - rect.left));
  const frame = pxToFrame(localX, currentPxPerFrame, bodyEl.scrollLeft);

  const contentWidth = durationInFrames * nextPx;
  const maxScroll = Math.max(0, contentWidth - bodyEl.clientWidth);
  const scrollLeft = Math.min(maxScroll, Math.max(0, frame * nextPx - localX));

  return { pxPerFrame: nextPx, scrollLeft };
}

export function clampScrollLeft(el: HTMLElement, next: number): number {
  const max = Math.max(0, el.scrollWidth - el.clientWidth);
  return Math.min(max, Math.max(0, next));
}

export function clampScrollTop(el: HTMLElement, next: number): number {
  const max = Math.max(0, el.scrollHeight - el.clientHeight);
  return Math.min(max, Math.max(0, next));
}
