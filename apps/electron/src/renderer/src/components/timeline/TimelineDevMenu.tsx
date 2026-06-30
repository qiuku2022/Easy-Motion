import {
  Code2,
  FileInput,
  MoreHorizontal,
  RefreshCw,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AddTrackMenu } from "@/components/timeline/AddTrackMenu";
import { useTimelineToolbarMenu } from "@/hooks/useTimelineToolbarMenu";
import {
  TimelineMenuItem,
  TimelineMenuPanel,
} from "@/lib/timeline/toolbar-menu";
import { useTimelineStore } from "@/stores/timelineStore";

interface TimelineDevMenuProps {
  disabled?: boolean;
}

export function TimelineDevMenu({ disabled }: TimelineDevMenuProps) {
  const { open, toggle, close, rootRef } = useTimelineToolbarMenu();
  const isLoading = useTimelineStore((s) => s.isLoading);
  const isGenerating = useTimelineStore((s) => s.isGenerating);
  const isSaving = useTimelineStore((s) => s.isSaving);
  const isSyncingRemotion = useTimelineStore((s) => s.isSyncingRemotion);
  const timeline = useTimelineStore((s) => s.timeline);
  const remotionDrift = useTimelineStore((s) => s.remotionDrift);
  const loadTimeline = useTimelineStore((s) => s.loadTimeline);
  const applySampleTimeline = useTimelineStore((s) => s.applySampleTimeline);
  const runGenerate = useTimelineStore((s) => s.runGenerate);
  const syncFromRemotion = useTimelineStore((s) => s.syncFromRemotion);
  const clearError = useTimelineStore((s) => s.clearError);

  const busy = disabled || isLoading || isGenerating || isSaving;

  const run = (fn: () => void | Promise<void>) => {
    clearError();
    void fn();
    close();
  };

  return (
    <div className="flex items-center gap-2">
      <AddTrackMenu disabled={busy || !timeline} />

      <div ref={rootRef} className="relative">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={busy}
          className={cn(
            "h-8 w-8 text-muted-foreground",
            open && "bg-muted text-foreground shadow-none focus-visible:ring-0",
          )}
          title="更多时间线操作"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={toggle}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">更多时间线操作</span>
        </Button>

        {open && (
          <TimelineMenuPanel align="end" className="min-w-[11rem]">
            <TimelineMenuItem disabled={busy} onClick={() => run(syncFromRemotion)}>
              <FileInput
                className={cn("h-3.5 w-3.5", isSyncingRemotion && "animate-pulse")}
              />
              {isSyncingRemotion ? "读取中…" : "从 Remotion 读取"}
            </TimelineMenuItem>
            <TimelineMenuItem disabled={busy} onClick={() => run(loadTimeline)}>
              <RefreshCw
                className={cn(
                  "h-3.5 w-3.5",
                  isLoading && !isSyncingRemotion && "animate-spin",
                )}
              />
              加载时间线
            </TimelineMenuItem>
            <TimelineMenuItem disabled={busy} onClick={() => run(applySampleTimeline)}>
              <Wand2 className="h-3.5 w-3.5" />
              写入示例
            </TimelineMenuItem>
            <TimelineMenuItem
              disabled={busy || !timeline}
              onClick={() => run(() => runGenerate({ manual: true }))}
            >
              <Code2 className="h-3.5 w-3.5" />
              <span className="flex-1">{isGenerating ? "生成中…" : "生成预览"}</span>
              {remotionDrift?.hasCustomRemotionCode ? (
                <span className="text-[10px] text-amber-200/80">将覆盖 MainSequence</span>
              ) : null}
            </TimelineMenuItem>
          </TimelineMenuPanel>
        )}
      </div>
    </div>
  );
}
