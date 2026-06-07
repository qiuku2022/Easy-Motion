import { useCallback, useEffect, useRef } from "react";

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import {

  parsePreviewMessage,

  postPreview,

  PREVIEW_CHANNEL,

} from "@/lib/preview-messages";

import { usePreviewBootstrap } from "@/hooks/usePreviewBootstrap";

import { usePlaybackStore } from "@/stores/playbackStore";

import { useTimelineStore } from "@/stores/timelineStore";

import { getEasyMotion } from "@/types/easyMotion";



export function PreviewWindow() {

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
  const previewTimelineNonce = useTimelineStore((s) => s.previewTimelineNonce);

  const setCurrentFrame = useTimelineStore((s) => s.setCurrentFrame);

  const timeline = useTimelineStore((s) => s.timeline);

  const setPlaying = usePlaybackStore((s) => s.setPlaying);

  const registerHandlers = usePlaybackStore((s) => s.registerHandlers);

  const unregisterHandlers = usePlaybackStore((s) => s.unregisterHandlers);



  const maxFrame = Math.max(0, (timeline?.durationInFrames ?? 90) - 1);



  useEffect(() => {

    const onMessage = (event: MessageEvent) => {

      const msg = parsePreviewMessage(event.data);

      if (!msg) return;

      if (msg.type === "FRAME_CHANGE") {

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

    await new Promise((resolve) => window.setTimeout(resolve, 120));



    const api = getEasyMotion();

    const frame = useTimelineStore.getState().currentFrame;

    const win = iframeRef.current?.contentWindow;



    if (win && previewUrl) {

      postPreview(win, { channel: PREVIEW_CHANNEL, type: "RELOAD" });

      window.setTimeout(() => postPreview(win, { channel: PREVIEW_CHANNEL, type: "SEEK", frame }), 100);

      return;

    }



    if (!api?.preview.getState) return;

    const state = await api.preview.getState();

    if (state.success && state.data?.status === "running" && state.data.url) {

      const base = state.data.url.split("?")[0];

      setPreviewUrl(`${base}?t=${Date.now()}`);

    }

  }, [previewUrl, setPreviewUrl]);



  useEffect(() => {

    if (previewReloadNonce === 0) return;

    void reloadPreview();

  }, [previewReloadNonce, reloadPreview]);

  const pushTimelineToPreview = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    const tl = useTimelineStore.getState().timeline;
    if (!win || !tl) return;
    postPreview(win, {
      channel: PREVIEW_CHANNEL,
      type: "TIMELINE_UPDATE",
      timeline: tl,
    });
  }, []);

  useEffect(() => {
    if (previewTimelineNonce === 0) return;
    pushTimelineToPreview();
  }, [previewTimelineNonce, pushTimelineToPreview]);

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

    [],

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



  return (

    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-black">

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3">

        {showOverlay && (

          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-6 text-center">

            {isLoading && (

              <Loader2 className="h-8 w-8 animate-spin text-em-teal" aria-hidden />

            )}



            <div className="max-w-md space-y-2">

              {!hasProject && (

                <p className="text-sm text-em-muted">打开或创建项目后将自动启动 Remotion 预览</p>

              )}



              {hasProject && isLoading && (

                <>

                  <p className="text-sm text-em-text">

                    {isGenerating ? "正在根据时间线生成 Remotion 代码…" : hint}

                  </p>

                  <p className="text-xs text-em-muted">

                    {isGenerating

                      ? "生成完成后将自动连接预览服务"

                      : "预览启动中，无需手动点击"}

                  </p>

                </>

              )}



              {hasProject && !isLoading && error && (

                <>

                  <p className="text-sm text-red-400">{error}</p>

                  <button

                    type="button"

                    onClick={retry}

                    className="cursor-pointer rounded-sm bg-em-accent px-4 py-2 text-sm text-white transition-colors duration-150 ease-out hover:bg-em-accent-hover"

                  >

                    重试启动预览

                  </button>

                </>

              )}

            </div>



            {hasProject && isLoading && logs.length > 0 && (

              <div className="w-full max-w-lg rounded-sm border border-em-border bg-em-bg/90 px-3 py-2 text-left">

                <p className="mb-1 text-[10px] uppercase tracking-wide text-em-muted">

                  启动日志

                </p>

                <ul className="max-h-28 space-y-0.5 overflow-y-auto font-mono text-[11px] leading-relaxed text-em-muted">

                  {logs.map((line, i) => (

                    <li key={`${i}-${line.slice(0, 24)}`} className="truncate">

                      {line}

                    </li>

                  ))}

                </ul>

              </div>

            )}

          </div>

        )}



        <iframe

          ref={iframeRef}

          src={previewUrl ?? undefined}

          title="Remotion Preview"

          className={cn(

            "max-h-full max-w-full rounded-lg border border-em-border",

            !previewUrl && "hidden",

          )}

          style={

            previewUrl

              ? { height: "100%", width: "100%", maxHeight: "100%", maxWidth: "100%" }

              : undefined

          }

          onLoad={() => {
            const frame = useTimelineStore.getState().currentFrame;
            const win = iframeRef.current?.contentWindow;
            if (!win) return;
            pushTimelineToPreview();
            postPreview(win, { channel: PREVIEW_CHANNEL, type: "SEEK", frame });
          }}

        />

      </div>

    </section>

  );

}

