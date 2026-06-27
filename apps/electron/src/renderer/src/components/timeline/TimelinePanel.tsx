import { Button } from "@/components/ui/button";
import { blurEditableFocusUnlessTarget } from "@/lib/keyboard";
import { useTimelineStore } from "@/stores/timelineStore";
import { formatRemotionSyncSummary } from "@/lib/remotion-sync";
import { TimelineBody } from "@/components/timeline/TimelineBody";
import { KeyframeTrackPanel } from "@/components/timeline/KeyframeTrackPanel";
import { TimelineDevMenu } from "@/components/timeline/TimelineDevMenu";
import { TimelineTransport } from "@/components/timeline/TimelineTransport";
import { TimelineZoomControls } from "@/components/timeline/TimelineZoomControls";
import { resolveTimelineViewportDuration } from "@/lib/timeline/workArea";
import { useUiStore } from "@/stores/uiStore";

export function TimelinePanel() {
  const collapsed = useUiStore((s) => s.timelineCollapsed);
  const timeline = useTimelineStore((s) => s.timeline);
  const isLoading = useTimelineStore((s) => s.isLoading);
  const isGenerating = useTimelineStore((s) => s.isGenerating);
  const isSaving = useTimelineStore((s) => s.isSaving);
  const error = useTimelineStore((s) => s.error);
  const currentFrame = useTimelineStore((s) => s.currentFrame);
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);
  const selectedMarkerId = useTimelineStore((s) => s.selectedMarkerId);
  const selectClip = useTimelineStore((s) => s.selectClip);
  const clearError = useTimelineStore((s) => s.clearError);
  const remotionDrift = useTimelineStore((s) => s.remotionDrift);
  const isSyncingRemotion = useTimelineStore((s) => s.isSyncingRemotion);
  const lastRemotionSync = useTimelineStore((s) => s.lastRemotionSync);
  const syncFromRemotion = useTimelineStore((s) => s.syncFromRemotion);
  const busy = isLoading || isGenerating || isSaving;
  const showRemotionSyncBanner =
    Boolean(remotionDrift?.suggestSync) && !isSyncingRemotion;

  if (collapsed) {
    return (
      <footer className="z-10 flex h-10 shrink-0 items-center border-t border-border bg-background px-3 text-xs text-muted-foreground">
        时间线（已收起）
      </footer>
    );
  }

  const fps = timeline?.fps ?? 30;
  const duration = timeline ? resolveTimelineViewportDuration(timeline) : 0;

  return (
    <footer className="relative z-20 flex h-full min-h-0 flex-col overflow-hidden border-t border-border bg-background">
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-2 py-1">
        <TimelineTransport />
        <div className="relative z-[30] ml-auto flex items-center gap-2">
          <TimelineZoomControls />
          <TimelineDevMenu disabled={busy} />
        </div>
      </div>

      {error && (
        <p className="shrink-0 px-3 py-1.5 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      {isSyncingRemotion && (
        <p
          className="shrink-0 border-b border-ring/20 bg-ring/5 px-3 py-1.5 text-xs text-ring"
          role="status"
        >
          正在从 Remotion 自动同步时间线…
        </p>
      )}

      {lastRemotionSync && !error && !isSyncingRemotion && (
        <p
          className="shrink-0 border-b border-ring/20 bg-ring/5 px-3 py-1.5 text-xs text-ring"
          role="status"
        >
          已从 Remotion 映射到时间线：{formatRemotionSyncSummary(lastRemotionSync)}
        </p>
      )}

      {showRemotionSyncBanner && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          <p>
            {remotionDrift?.tracksEmpty
              ? "时间线轨道为空，但 Remotion 项目有内容。"
              : "Remotion 源码已变更，自动同步未成功。"}
            {" "}
            可手动重试「从 Remotion 读取」。
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            className="h-7 shrink-0 border-amber-500/30 bg-amber-500/20 text-xs text-amber-50 hover:bg-amber-500/30"
            onClick={() => {
              clearError();
              void syncFromRemotion();
            }}
          >
            重试读取
          </Button>
        </div>
      )}

      {timeline && timeline.tracks.length > 0 ? (
        <>
          <TimelineBody
            tracks={timeline.tracks}
            durationInFrames={duration}
            fps={fps}
            currentFrame={currentFrame}
            selectedClipId={selectedClipId}
            selectedMarkerId={selectedMarkerId}
            onSelectClip={selectClip}
            onPointerDownCapture={(e) => blurEditableFocusUnlessTarget(e.target)}
          />
          <KeyframeTrackPanel />
        </>
      ) : (
        <div
          className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground"
          onPointerDownCapture={(e) => blurEditableFocusUnlessTarget(e.target)}
        >
          <p className="text-foreground">开始你的动画创作</p>
          <p className="max-w-md text-xs">
            点击上方「+ 轨道」添加文字或分组；若 Remotion 源码已有内容，可用「⋯」→「从 Remotion 读取」同步。
          </p>
        </div>
      )}
    </footer>
  );
}
