import {
  ChevronFirst,
  ChevronLast,
  Flag,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatTimecode } from "@/lib/timecode";
import { resolveExportFrameRange } from "@/lib/timeline/workArea";
import { PR_SHORTCUTS } from "@/lib/premiereShortcuts";
import { usePlaybackStore } from "@/stores/playbackStore";
import { useTimelineStore } from "@/stores/timelineStore";

function TransportButton({
  label,
  children,
  onClick,
  disabled,
  className,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={className ?? "h-8 w-8"}
          disabled={disabled}
          onClick={onClick}
        >
          {children}
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function IoButton({
  label,
  children,
  onClick,
  disabled,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 min-w-7 px-1.5 font-mono text-[11px] font-semibold"
          disabled={disabled}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function TimelineTransport() {
  const timeline = useTimelineStore((s) => s.timeline);
  const currentFrame = useTimelineStore((s) => s.currentFrame);
  const toggleMarkerAtPlayhead = useTimelineStore((s) => s.toggleMarkerAtPlayhead);
  const setInPointAtPlayhead = useTimelineStore((s) => s.setInPointAtPlayhead);
  const setOutPointAtPlayhead = useTimelineStore((s) => s.setOutPointAtPlayhead);
  const clearWorkArea = useTimelineStore((s) => s.clearWorkArea);
  const clearError = useTimelineStore((s) => s.clearError);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const seekTo = usePlaybackStore((s) => s.seekTo);
  const togglePlay = usePlaybackStore((s) => s.togglePlay);

  const fps = timeline?.fps ?? 30;
  const totalFrames = timeline?.durationInFrames ?? 0;
  const maxFrame = Math.max(0, totalFrames - 1);
  const hasTimeline = Boolean(timeline && totalFrames > 0);
  const workArea = timeline ? resolveExportFrameRange(timeline) : null;

  return (
    <div className="flex shrink-0 items-center gap-1">
      <TransportButton
        label="跳到开头"
        disabled={!hasTimeline}
        onClick={() => seekTo(0)}
      >
        <ChevronFirst className="h-4 w-4" />
      </TransportButton>
      <TransportButton
        label={`上一帧 (${PR_SHORTCUTS.stepFrameBack})`}
        disabled={!hasTimeline}
        onClick={() => seekTo(currentFrame - 1)}
      >
        <SkipBack className="h-4 w-4" />
      </TransportButton>
      <TransportButton
        label={
          isPlaying
            ? `暂停 (${PR_SHORTCUTS.playPause} / ${PR_SHORTCUTS.pause})`
            : `播放 (${PR_SHORTCUTS.playPause} / ${PR_SHORTCUTS.playForward})`
        }
        disabled={!hasTimeline}
        onClick={togglePlay}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </TransportButton>
      <TransportButton
        label={`下一帧 (${PR_SHORTCUTS.stepFrameForward})`}
        disabled={!hasTimeline}
        onClick={() => seekTo(currentFrame + 1)}
      >
        <SkipForward className="h-4 w-4" />
      </TransportButton>
      <TransportButton
        label="跳到结尾"
        disabled={!hasTimeline}
        onClick={() => seekTo(maxFrame)}
      >
        <ChevronLast className="h-4 w-4" />
      </TransportButton>

      <Separator orientation="vertical" className="mx-1 h-4" />

      <IoButton
        label={`设置入点 (${PR_SHORTCUTS.setInPoint})`}
        disabled={!hasTimeline}
        onClick={() => {
          clearError();
          setInPointAtPlayhead();
        }}
      >
        I
      </IoButton>
      <IoButton
        label={`设置出点 (${PR_SHORTCUTS.setOutPoint})`}
        disabled={!hasTimeline}
        onClick={() => {
          clearError();
          setOutPointAtPlayhead();
        }}
      >
        O
      </IoButton>
      {timeline?.workArea ? (
        <TransportButton
          label={`清除 I/O (${PR_SHORTCUTS.clearWorkArea})`}
          disabled={!hasTimeline}
          className="h-7 w-7"
          onClick={() => clearWorkArea()}
        >
          <X className="h-3.5 w-3.5" />
        </TransportButton>
      ) : null}

      <Separator orientation="vertical" className="mx-1 h-4" />

      <TransportButton
        label={`添加/删除标记 (${PR_SHORTCUTS.addMarker})`}
        disabled={!hasTimeline}
        onClick={() => {
          clearError();
          toggleMarkerAtPlayhead();
        }}
      >
        <Flag className="h-4 w-4 text-amber-400" />
      </TransportButton>

      <div className="ml-2 flex flex-col gap-0.5 font-mono text-[10px] leading-tight tabular-nums text-foreground">
        <span>
          {hasTimeline ? formatTimecode(currentFrame, fps) : "--:--"}
          <span className="mx-1 text-muted-foreground">/</span>
          {hasTimeline ? formatTimecode(totalFrames, fps) : "--:--"}
        </span>
        {hasTimeline && workArea ? (
          <span className="text-amber-400/90">
            I/O {formatTimecode(workArea.inFrame, fps)} –{" "}
            {formatTimecode(workArea.outFrame + 1, fps)}
            {!workArea.custom ? (
              <span className="ml-1 text-muted-foreground">(内容末尾)</span>
            ) : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}
