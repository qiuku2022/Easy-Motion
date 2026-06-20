import { useCallback, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  parsePreviewMessage,
  postPreview,
  PREVIEW_CHANNEL,
} from "@/lib/preview-messages";
import { usePreviewAspectFit, PREVIEW_DISPLAY_ASPECT } from "@/hooks/usePreviewAspectFit";
import { usePreviewBootstrap } from "@/hooks/usePreviewBootstrap";
import { usePlaybackStore } from "@/stores/playbackStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { getEasyMotion } from "@/types/easyMotion";

export function PreviewWindow() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const {
    previewUrl,
    setPreviewUrl,
    isLoading,
    isGenerating,
    error,
    hint,
    logs,
    retry,
    hasProject,
  } = usePreviewBootstrap();

  const previewReloadNonce = useTimelineStore((s) => s.previewReloadNonce);
  const previewFullReloadNonce = useTimelineStore((s) => s.previewFullReloadNonce);
  const previewTimelineNonce = useTimelineStore((s) => s.previewTimelineNonce);
  const timeline = useTimelineStore((s) => s.timeline);

  const previewSize = usePreviewAspectFit(viewportRef, PREVIEW_DISPLAY_ASPECT);

  const setCurrentFrame = useTimelineStore((s) => s.setCurrentFrame);
  const setPlaying = usePlaybackStore((s) => s.setPlaying);
  const loopEnabled = usePlaybackStore((s) => s.loopEnabled);
  const registerHandlers = usePlaybackStore((s) => s.registerHandlers);
  const unregisterHandlers = usePlaybackStore((s) => s.unregisterHandlers);

  const maxFrame = Math.max(0, (timeline?.durationInFrames ?? 90) - 1);

  const previewUrlRef = useRef<string | null>(null);
  previewUrlRef.current = previewUrl;

  /** Ignore spurious frame-0 updates while preview remounts after reload. */
  const preservePlayheadRef = useRef<{ frame: number; until: number } | null>(
    null,
  );

  const markPreservePlayhead = useCallback(() => {
    const frame = useTimelineStore.getState().currentFrame;
    preservePlayheadRef.current = { frame, until: Date.now() + 2500 };
    return frame;
  }, []);

  const restorePlayheadToPreview = useCallback(
    (frame: number, delayMs = 0) => {
      window.setTimeout(() => {
        useTimelineStore.getState().setCurrentFrame(frame);
        const win = iframeRef.current?.contentWindow;
        if (win) {
          postPreview(win, { channel: PREVIEW_CHANNEL, type: "SEEK", frame });
        }
      }, delayMs);
    },
    [],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const msg = parsePreviewMessage(event.data);
      if (!msg) return;
      if (msg.type === "FRAME_CHANGE") {
        const preserve = preservePlayheadRef.current;
        if (preserve && Date.now() < preserve.until) {
          return;
        }
        if (!usePlaybackStore.getState().isPlaying) {
          return;
        }
        setCurrentFrame(msg.frame);
      }
      if (msg.type === "PLAYBACK_STATE") {
        setPlaying(msg.playing);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [setCurrentFrame, setPlaying]);

  const reloadPreview = useCallback(async () => {
    const win = iframeRef.current?.contentWindow;
    const currentUrl = previewUrlRef.current;
    const frame = markPreservePlayhead();

    if (win && currentUrl) {
      postPreview(win, { channel: PREVIEW_CHANNEL, type: "RELOAD", frame });
      window.setTimeout(() => {
        const w = iframeRef.current?.contentWindow;
        if (!w) return;
        const tl = useTimelineStore.getState().timeline;
        if (tl) {
          postPreview(w, {
            channel: PREVIEW_CHANNEL,
            type: "TIMELINE_UPDATE",
            timeline: tl,
            frame,
          });
        }
        postPreview(w, { channel: PREVIEW_CHANNEL, type: "SEEK", frame });
      }, 120);
      restorePlayheadToPreview(frame, 250);
    }
  }, [markPreservePlayhead, restorePlayheadToPreview]);

  const fullReloadPreview = useCallback(async () => {
    const frame = markPreservePlayhead();
    await new Promise((resolve) => window.setTimeout(resolve, 400));

    const api = getEasyMotion();
    if (api?.preview?.getState) {
      const state = await api.preview.getState();
      if (state.success && state.data?.status === "running" && state.data.url) {
        const base = state.data.url.split("?")[0];
        setPreviewUrl(`${base}?t=${Date.now()}`);
        restorePlayheadToPreview(frame, 500);
        return;
      }
    }

    await reloadPreview();
  }, [markPreservePlayhead, reloadPreview, restorePlayheadToPreview, setPreviewUrl]);

  useEffect(() => {
    if (previewReloadNonce === 0) return;
    void reloadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewReloadNonce]);

  useEffect(() => {
    if (previewFullReloadNonce === 0) return;
    void fullReloadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewFullReloadNonce]);

  const pushTimelineToPreview = useCallback(() => {
    const tl = useTimelineStore.getState().timeline;
    if (!tl) return false;

    const win = iframeRef.current?.contentWindow;
    if (!win) return false;

    const frame = markPreservePlayhead();
    postPreview(win, {
      channel: PREVIEW_CHANNEL,
      type: "TIMELINE_UPDATE",
      timeline: tl,
      frame,
    });
    return true;
  }, [markPreservePlayhead]);

  useEffect(() => {
    if (previewTimelineNonce === 0) return;

    const frame = markPreservePlayhead();
    const restoreOnce = () => restorePlayheadToPreview(frame, 200);

    if (pushTimelineToPreview()) {
      restoreOnce();
      return;
    }

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (pushTimelineToPreview()) {
        window.clearInterval(timer);
        restoreOnce();
      } else if (attempts >= 30) {
        window.clearInterval(timer);
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, [previewTimelineNonce, pushTimelineToPreview, markPreservePlayhead, restorePlayheadToPreview]);

  const pushLoopToPreview = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    postPreview(win, {
      channel: PREVIEW_CHANNEL,
      type: "SET_LOOP",
      loop: usePlaybackStore.getState().loopEnabled,
    });
  }, []);

  useEffect(() => {
    if (!previewUrl) return;
    pushLoopToPreview();
  }, [loopEnabled, previewUrl, pushLoopToPreview]);

  const postToPreview = useCallback(
    (type: "PLAY" | "PAUSE" | "SEEK", frame?: number) => {
      const win = iframeRef.current?.contentWindow;
      if (type === "PLAY") {
        postPreview(win, { channel: PREVIEW_CHANNEL, type: "PLAY" });
      } else if (type === "PAUSE") {
        postPreview(win, { channel: PREVIEW_CHANNEL, type: "PAUSE" });
      } else if (type === "SEEK" && frame !== undefined) {
        postPreview(win, { channel: PREVIEW_CHANNEL, type: "SEEK", frame });
      }
    },
    []
  );

  useEffect(() => {
    registerHandlers({
      seek: (frame) => {
        const clamped = Math.min(maxFrame, Math.max(0, frame));
        postToPreview("SEEK", clamped);
      },
      play: () => {
        const frame = useTimelineStore.getState().currentFrame;
        setPlaying(true);
        postToPreview("SEEK", frame);
        postToPreview("PLAY");
      },
      pause: () => {
        setPlaying(false);
        postToPreview("PAUSE");
      },
    });
    return () => unregisterHandlers();
  }, [maxFrame, postToPreview, registerHandlers, setPlaying, unregisterHandlers]);

  const showOverlay = !previewUrl && (isLoading || error || !hasProject);

  const previewFrameStyle =
    previewSize.width > 0
      ? { width: previewSize.width, height: previewSize.height }
      : { width: "100%", aspectRatio: `${PREVIEW_DISPLAY_ASPECT}` };

  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-preview-canvas">
      <div
        ref={viewportRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-preview-canvas p-3"
      >
        <div
          className="relative shrink-0 overflow-hidden rounded-lg border border-border bg-black shadow-sm"
          style={previewFrameStyle}
        >
          {showOverlay && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-preview-canvas px-6 text-center">
              {isLoading && (
                <Loader2 className="h-8 w-8 animate-spin text-ring" aria-hidden />
              )}

              <div className="max-w-md space-y-2">
                {!hasProject && (
                  <p className="text-sm text-muted-foreground">
                    打开或创建项目后将自动启动 Remotion 预览
                  </p>
                )}

                {hasProject && isLoading && (
                  <>
                    <p className="text-sm text-foreground">
                      {isGenerating ? "正在根据时间线生成 Remotion 代码…" : hint}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isGenerating
                        ? "生成完成后将自动连接预览服务"
                        : "预览启动中，无需手动点击"}
                    </p>
                  </>
                )}

                {hasProject && !isLoading && error && (
                  <>
                    <p className="text-sm text-destructive">{error}</p>
                    <Button type="button" onClick={retry}>
                      重试启动预览
                    </Button>
                  </>
                )}
              </div>

              {hasProject && isLoading && logs.length > 0 && (
                <div className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-background/90 px-3 py-2 text-left">
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    启动日志
                  </p>
                  <ScrollArea className="h-28 w-full">
                    <ul className="space-y-0.5 pr-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                      {logs.map((line, i) => (
                        <li key={`${i}-${line.slice(0, 24)}`} className="break-all">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          <iframe
            ref={iframeRef}
            src={previewUrl ?? undefined}
            title="Remotion Preview"
            className={cn("h-full w-full", !previewUrl && "invisible")}
            onLoad={() => {
              const frame = markPreservePlayhead();
              const win = iframeRef.current?.contentWindow;
              if (!win) return;
              pushTimelineToPreview();
              pushLoopToPreview();
              restorePlayheadToPreview(frame, 150);
            }}
          />
        </div>
      </div>
    </section>
  );
}
