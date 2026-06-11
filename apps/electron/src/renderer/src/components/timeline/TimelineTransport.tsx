import {
  ChevronFirst,
  ChevronLast,
  Flag,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatTimecode } from "@/lib/timecode";
import { PR_SHORTCUTS } from "@/lib/premiereShortcuts";
import { usePlaybackStore } from "@/stores/playbackStore";
import { useTimelineStore } from "@/stores/timelineStore";

function TransportButton({
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
          variant="ghost"
          size="icon"
          className="h-8 w-8"
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

export function TimelineTransport() {
  const timeline = useTimelineStore((s) => s.timeline);
  const currentFrame = useTimelineStore((s) => s.currentFrame);
  const toggleMarkerAtPlayhead = useTimelineStore((s) => s.toggleMarkerAtPlayhead);
  const clearError = useTimelineStore((s) => s.clearError);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const seekTo = usePlaybackStore((s) => s.seekTo);
  const togglePlay = usePlaybackStore((s) => s.togglePlay);

  const fps = timeline?.fps ?? 30;
  const totalFrames = timeline?.durationInFrames ?? 0;
  const maxFrame = Math.max(0, totalFrames - 1);
  const hasTimeline = Boolean(timeline && totalFrames > 0);

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

      <span className="ml-2 font-mono text-xs tabular-nums text-foreground">
        {hasTimeline ? (
          <>
            {formatTimecode(currentFrame, fps)}
            <span className="mx-1 text-muted-foreground">/</span>
            {formatTimecode(totalFrames, fps)}
          </>
        ) : (
          <span className="text-muted-foreground">--:-- / --:--</span>
        )}
      </span>
    </div>
  );
}
