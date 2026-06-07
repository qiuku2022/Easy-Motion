import {
  ChevronFirst,
  ChevronLast,
  Flag,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { formatTimecode } from "@/lib/timecode";
import { PR_SHORTCUTS } from "@/lib/premiereShortcuts";
import { usePlaybackStore } from "@/stores/playbackStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { cn } from "@/lib/utils";

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
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-sm p-1.5 text-em-text transition-colors duration-150 ease-out hover:bg-em-elevated disabled:cursor-not-allowed disabled:opacity-40",
      )}
    >
      {children}
    </button>
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

      <div className="mx-1 h-4 w-px bg-em-border" aria-hidden />

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

      <span className="ml-2 font-mono text-xs tabular-nums text-em-text">
        {hasTimeline ? (
          <>
            {formatTimecode(currentFrame, fps)}
            <span className="mx-1 text-em-muted">/</span>
            {formatTimecode(totalFrames, fps)}
          </>
        ) : (
          <span className="text-em-muted">--:-- / --:--</span>
        )}
      </span>
    </div>
  );
}
