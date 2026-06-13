import { useMemo } from "react";
import { AlignCenterHorizontal, Scissors, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
        "clip-floating-toolbar pointer-events-auto absolute z-[60] flex items-center gap-0.5 rounded-md border border-border bg-popover px-1 py-0.5 shadow-lg shadow-black/30",
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
      <DeleteClipToolbarButton
        shortcut={PR_SHORTCUTS.delete}
        onConfirm={() => run(deleteSelectedClip)}
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
  return <Separator orientation="vertical" className="mx-0.5 h-4" />;
}

function DeleteClipToolbarButton({
  shortcut,
  onConfirm,
}: {
  shortcut: string;
  onConfirm: () => void;
}) {
  const label = "删除";
  const tip = `${label} (${shortcut})`;

  return (
    <AlertDialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 rounded-md px-2 text-[11px] text-red-400 hover:bg-red-500/15 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{label}</span>
              <span className="sr-only">{tip}</span>
            </Button>
          </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">{tip}</TooltipContent>
      </Tooltip>
      <AlertDialogContent className="z-[100]">
        <AlertDialogHeader>
          <AlertDialogTitle>删除片段？</AlertDialogTitle>
          <AlertDialogDescription>
            将从时间线移除当前选中的片段。此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
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
  const tip = shortcut ? `${label} (${shortcut})` : label;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={onClick}
          className={cn(
            "h-7 gap-1 rounded-md px-2 text-[11px]",
            danger
              ? "text-red-400 hover:bg-red-500/15 hover:text-red-400"
              : "text-foreground",
          )}
        >
          {icon}
          <span>{label}</span>
          <span className="sr-only">{tip}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{tip}</TooltipContent>
    </Tooltip>
  );
}
