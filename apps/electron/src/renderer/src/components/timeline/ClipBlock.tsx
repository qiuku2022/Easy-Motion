import { cn } from "@/lib/utils";
import { frameToPx } from "@/lib/timeline/framePixels";
import { clipBarClassName, clipBarHandleClassName } from "@/lib/timeline/clipBarStyles";
import type { ClipDragMode } from "@/components/timeline/clipDragTypes";
import type { Clip, Keyframe, TrackType } from "@/types/timeline";
import { usePlaybackStore } from "@/stores/playbackStore";

interface ClipBlockProps {
  clip: Clip;
  contentType: TrackType | string;
  pxPerFrame: number;
  selected: boolean;
  disabled: boolean;
  dragging?: boolean;
  onSelect: () => void;
  onDragStart: (e: React.PointerEvent, mode: ClipDragMode) => void;
}

export function ClipBlock({
  clip,
  contentType,
  pxPerFrame,
  selected,
  disabled,
  dragging,
  onSelect,
  onDragStart,
}: ClipBlockProps) {
  const left = frameToPx(clip.startInFrames, pxPerFrame);
  const width = Math.max(frameToPx(clip.durationInFrames, pxPerFrame), 8);
  const end = clip.startInFrames + clip.durationInFrames;

  return (
    <div
      className={cn(
        "absolute inset-y-0.5 z-[15]",
        selected && !disabled && "z-20",
        dragging && "z-50",
        disabled && "pointer-events-none opacity-60",
      )}
      style={{ left, width }}
    >
      {selected && !disabled && width >= 16 && (
        <>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="裁剪开头"
            className={cn(clipBarHandleClassName(true), "left-0 rounded-l-[3px]")}
            onPointerDown={(e) => onDragStart(e, "resize-left")}
          />
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="裁剪结尾"
            className={cn(clipBarHandleClassName(true), "right-0 rounded-r-[3px]")}
            onPointerDown={(e) => onDragStart(e, "resize-right")}
          />
        </>
      )}

      <button
        type="button"
        disabled={disabled}
        data-selected={selected || undefined}
        onClick={onSelect}
        onDoubleClick={() => {
          if (disabled) return;
          usePlaybackStore.getState().seekTo(clip.startInFrames);
        }}
        onPointerDown={(e) => {
          if (disabled || e.button !== 0) return;
          if ((e.target as HTMLElement).closest('[role="separator"]')) return;
          onDragStart(e, "move");
        }}
        className={clipBarClassName(contentType, { selected, disabled, dragging })}
        title={`${clip.name} (${clip.startInFrames}–${end})`}
      >
        {clip.name}
      </button>

      {(clip.keyframes as Keyframe[] | undefined)?.map((kf) => {
        const kfLeft = frameToPx(kf.frame, pxPerFrame);
        return (
          <span
            key={kf.id}
            className="pointer-events-none absolute bottom-0.5 z-30 h-1.5 w-1.5 -translate-x-1/2 rotate-45 border border-amber-200 bg-amber-400"
            style={{ left: kfLeft }}
            title={`关键帧 ${kf.property} @${kf.frame}`}
          />
        );
      })}

      {dragging && (
        <span className="pointer-events-none absolute -top-5 left-0 z-50 whitespace-nowrap rounded-sm bg-popover px-1 py-0.5 font-mono text-[10px] text-popover-foreground shadow">
          {clip.startInFrames}–{end}f
        </span>
      )}
    </div>
  );
}
