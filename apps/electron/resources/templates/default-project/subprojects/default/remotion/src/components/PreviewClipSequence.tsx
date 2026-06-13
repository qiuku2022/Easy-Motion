import React from "react";
import { Sequence } from "remotion";
import {
  getClipTimingForPreview,
  isClipVisibleInPreview,
} from "../lib/preview-visibility";

type TimelineLike = Parameters<typeof isClipVisibleInPreview>[1];

export type PreviewClipSequenceProps = {
  clipId: string;
  timeline?: TimelineLike;
  /** 未传入 timeline 或片段不在 JSON 中时的 Sequence 参数（导出渲染兼容） */
  fallbackFrom?: number;
  fallbackDuration?: number;
  children: React.ReactNode;
};

/** 预览时按 timeline JSON 驱动 Sequence 头尾；导出时回退到 fallback */
export function PreviewClipSequence({
  clipId,
  timeline,
  fallbackFrom = 0,
  fallbackDuration,
  children,
}: PreviewClipSequenceProps) {
  if (!isClipVisibleInPreview(clipId, timeline)) return null;

  const timing = getClipTimingForPreview(clipId, timeline);
  const from = timing?.startInFrames ?? fallbackFrom;
  const durationInFrames = timing?.durationInFrames ?? fallbackDuration;

  if (durationInFrames == null) {
    return <>{children}</>;
  }

  return (
    <Sequence from={from} durationInFrames={durationInFrames}>
      {children}
    </Sequence>
  );
}
