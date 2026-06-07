import { useCallback } from "react";
import { snapEditFrame } from "@/lib/timeline/snapEditFrame";
import { usePlaybackStore } from "@/stores/playbackStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useUiStore } from "@/stores/uiStore";

/** 计算吸附后的帧并 seek（时间线标尺 / 播放头共用） */
export function useSeekFrame() {
  const seekTo = usePlaybackStore((s) => s.seekTo);

  return useCallback(
    (rawFrame: number, options?: { snap?: boolean }) => {
      const timeline = useTimelineStore.getState().timeline;
      if (!timeline) return;

      const { snapEnabled, altKeyHeld, pxPerFrame } = useUiStore.getState();

      const frame = snapEditFrame(rawFrame, {
        timeline,
        pxPerFrame,
        currentFrame: useTimelineStore.getState().currentFrame,
        snapEnabled: options?.snap !== false && snapEnabled,
        altKeyHeld,
      });

      seekTo(frame);
    },
    [seekTo],
  );
}
