import { pxToFrame } from "@/lib/timeline/framePixels";
import { TRACK_HEADER_WIDTH } from "@/lib/timeline/constants";

/** 从指针位置计算内容区帧号（含水平滚动与左侧轨道头偏移） */
export function frameFromPointer(
  clientX: number,
  scrollContainer: HTMLElement,
  pxPerFrame: number,
  headerWidth = TRACK_HEADER_WIDTH,
): number {
  const rect = scrollContainer.getBoundingClientRect();
  const x = clientX - rect.left + scrollContainer.scrollLeft - headerWidth;
  return pxToFrame(x, pxPerFrame, 0);
}
