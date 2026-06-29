import { useCallback, type RefObject } from "react";
import { frameFromPointer } from "@/lib/timeline/pointerFrame";
import { useSeekFrame } from "@/hooks/useSeekFrame";

/** 在水平滚动内容区内拖拽播放头（无左侧轨道头偏移） */
export function usePlayheadDrag(
  scrollRef: RefObject<HTMLElement | null>,
  pxPerFrame: number,
) {
  const seekFrame = useSeekFrame();

  return useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const container = scrollRef.current;
      if (!container) return;

      const move = (ev: PointerEvent) => {
        const frame = frameFromPointer(ev.clientX, container, pxPerFrame, 0);
        seekFrame(frame, { altKeyHeld: ev.altKey });
      };

      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      seekFrame(frameFromPointer(e.clientX, container, pxPerFrame, 0), {
        altKeyHeld: e.altKey,
      });
    },
    [pxPerFrame, scrollRef, seekFrame],
  );
}
