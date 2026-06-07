import { useMemo } from "react";
import { AlignCenterHorizontal, Scissors, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRACK_ROW_HEIGHT } from "@/lib/timeline/constants";
import { frameToPx } from "@/lib/timeline/framePixels";
import { getClipRange } from "@/lib/timeline/clipCollision";
import {
  effectiveTrackState,
  findLayerTrackForClip,
  type TimelineRow,
} from "@/lib/timeline/trackTree";
import { PR_SHORTCUTS } from "@/lib/premiereShortcuts";
import type { ClipDragPreview } from "@/components/timeline/clipDragTypes";
import { useTimelineStore } from "@/stores/timelineStore";

const TOOLBAR_GAP_PX = 8;

interface ClipFloatingToolbarProps {
  rows: TimelineRow[];
  selectedClipId: string | null;
  pxPerFrame: number;
  currentFrame: number;
  dragPreview: ClipDragPreview | null;
}

export function ClipFloatingToolbar({
  rows,
  selectedClipId,
  pxPerFrame,
  currentFrame,
  dragPreview,
}: ClipFloatingToolbarProps) {
  const timeline = useTimelineStore((s) => s.timeline);
  const splitSelectedClipAtPlayhead = useTimelineStore(
    (s) => s.splitSelectedClipAtPlayhead,
  );
  const deleteSelectedClip = useTimelineStore((s) => s.deleteSelectedClip);
  const alignSelectedClipHorizontalCenter = useTimelineStore(
    (s) => s.alignSelectedClipHorizontalCenter,
  );
  const clearError = useTimelineStore((s) => s.clearError);

  const layout = useMemo(() => {
    if (!timeline || !selectedClipId) return null;
    if (dragPreview?.clipId === selectedClipId) return null;

    const located = findLayerTrackForClip(timeline, selectedClipId);
    if (!located) return null;

    const rowIndex = rows.findIndex(
      (row) => row.track.id === located.clipTrack.id && !row.isGroupHeader,
    );
    if (rowIndex < 0) return null;

    const row = rows[rowIndex]!;
    const { locked } = effectiveTrackState(row.track, row.parentGroup, timeline);
    if (locked) return null;

    const { clip } = located;
    const left = frameToPx(clip.startInFrames, pxPerFrame);
    const width = Math.max(frameToPx(clip.durationInFrames, pxPerFrame), 8);
    const centerX = left + width / 2;
    const rowTop = rowIndex * TRACK_ROW_HEIGHT;

    const range = getClipRange(clip);
    const canSplit = currentFrame > range.start && currentFrame < range.end;
    const placeBelow = rowIndex === 0;

    return {
      centerX,
      rowTop,
      placeBelow,
      canSplit,
    };
  }, [timeline, selectedClipId, dragPreview, rows, pxPerFrame, currentFrame]);

  if (!layout) return null;

  const { centerX, rowTop, placeBelow, canSplit } = layout;

  const run = (action: () => void) => {
    clearError();
    action();
  };

  return (
    <div
      className={cn(
        "clip-floating-toolbar pointer-events-auto absolute z-[60] flex items-center gap-0.5 rounded-md border border-em-border bg-em-elevated px-1 py-0.5 shadow-lg shadow-black/30",
        placeBelow ? "clip-floating-toolbar-below" : "clip-floating-toolbar-above",
      )}
      style={
        placeBelow
          ? {
              left: centerX,
              top: rowTop + TRACK_ROW_HEIGHT + TOOLBAR_GAP_PX,
              transform: "translateX(-50%)",
            }
          : {
              left: centerX,
              top: rowTop - TOOLBAR_GAP_PX,
              transform: "translate(-50%, -100%)",
            }
      }
      onPointerDown={(e) => e.stopPropagation()}
    >
      <ToolbarButton
        label="分割"
        shortcut={PR_SHORTCUTS.addEdit}
        icon={<Scissors className="h-3.5 w-3.5" />}
        disabled={!canSplit}
        onClick={() => run(splitSelectedClipAtPlayhead)}
      />
      <ToolbarDivider />
      <ToolbarButton
        label="删除"
        shortcut={PR_SHORTCUTS.delete}
        icon={<Trash2 className="h-3.5 w-3.5" />}
        danger
        onClick={() => run(deleteSelectedClip)}
      />
      <ToolbarDivider />
      <ToolbarButton
        label="水平居中"
        icon={<AlignCenterHorizontal className="h-3.5 w-3.5" />}
        onClick={() => run(alignSelectedClipHorizontalCenter)}
      />
    </div>
  );
}

function ToolbarDivider() {
  return <div className="mx-0.5 h-4 w-px bg-em-border" aria-hidden />;
}

function ToolbarButton({
  label,
  shortcut,
  icon,
  disabled,
  danger,
  onClick,
}: {
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  const title = shortcut ? `${label} (${shortcut})` : label;

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 rounded-sm px-2 py-1 text-[11px] transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-40",
        danger
          ? "text-red-400 hover:bg-red-500/15"
          : "text-em-text hover:bg-em-surface",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
