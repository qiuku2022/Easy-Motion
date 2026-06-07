import { snapFrame } from "@/lib/timeline/snap";
import type { Timeline } from "@/types/timeline";

export interface SnapEditOptions {
  timeline: Timeline;
  pxPerFrame: number;
  currentFrame: number;
  snapEnabled: boolean;
  altKeyHeld: boolean;
  excludeClipId?: string;
}

/** 编辑操作（拖片段/裁边）时的帧吸附，与播放头 seek 分离 */
export function snapEditFrame(rawFrame: number, options: SnapEditOptions): number {
  let frame = Math.round(rawFrame);
  const shouldSnap = options.snapEnabled && !options.altKeyHeld;

  if (shouldSnap) {
    const gridInterval = options.timeline.snapGrid?.enabled
      ? options.timeline.snapGrid.intervalInFrames
      : 1;
    frame = snapFrame(frame, options.timeline, {
      enabled: true,
      currentFrame: options.currentFrame,
      pxPerFrame: options.pxPerFrame,
      gridInterval,
      excludeClipId: options.excludeClipId,
    });
  }

  const max = Math.max(0, options.timeline.durationInFrames - 1);
  return Math.min(max, Math.max(0, frame));
}
