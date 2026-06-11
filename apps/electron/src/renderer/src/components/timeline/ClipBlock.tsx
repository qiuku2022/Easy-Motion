import { cn } from "@/lib/utils";
import { frameToPx } from "@/lib/timeline/framePixels";
import type { ClipDragMode } from "@/components/timeline/clipDragTypes";
import type { Clip } from "@/types/timeline";
import { usePlaybackStore } from "@/stores/playbackStore";

interface ClipBlockProps {
  clip: Clip;
  pxPerFrame: number;
  selected: boolean;
  disabled: boolean;
  dragging?: boolean;
  onSelect: () => void;
  onDragStart: (e: React.PointerEvent, mode: ClipDragMode) => void;
}

export function ClipBlock({
  clip,
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
        "absolute inset-y-1",
        dragging && "z-50 opacity-90",
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
            className="absolute bottom-0 left-0 top-0 z-10 w-1.5 cursor-ew-resize rounded-l-sm bg-foreground/30 hover:bg-foreground/50"
            onPointerDown={(e) => onDragStart(e, "resize-left")}
          />
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="裁剪结尾"
            className="absolute bottom-0 right-0 top-0 z-10 w-1.5 cursor-ew-resize rounded-r-sm bg-foreground/30 hover:bg-foreground/50"
            onPointerDown={(e) => onDragStart(e, "resize-right")}
          />
        </>
      )}

      <button
        type="button"
        disabled={disabled}
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
        className={cn(
          "h-full w-full truncate rounded-sm border px-1.5 text-left text-[11px] transition-colors duration-100 ease-out",
          disabled ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing",
          selected
            ? "border-foreground/60 bg-foreground/10 text-foreground shadow-sm shadow-black/15"
            : "border-border bg-muted/60 text-muted-foreground hover:border-foreground/25 hover:bg-muted hover:text-foreground",
          dragging && "ring-1 ring-foreground/30",
        )}
        title={`${clip.name} (${clip.startInFrames}–${end})`}
      >
        {clip.name}
      </button>

      {dragging && (
        <span className="pointer-events-none absolute -top-5 left-0 z-50 whitespace-nowrap rounded-sm bg-em-elevated px-1 py-0.5 font-mono text-[10px] text-em-text shadow">
          {clip.startInFrames}–{end}f
        </span>
      )}
    </div>
  );
}
