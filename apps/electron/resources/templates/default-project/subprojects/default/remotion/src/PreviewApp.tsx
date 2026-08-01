import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Player,
  type CallbackListener,
  type PlayerRef,
} from "@remotion/player";
import { MainSequence } from "./components/MainSequence";
import previewConfig from "./preview-config.json";

const CHANNEL = "easymotion-preview";

type EasymotionPreviewProps = {
  timeline?: Record<string, unknown>;
};

type PreviewMeta = {
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
};

type PlayRange = {
  inFrame: number | null;
  outFrame: number | null;
};

function metaFromTimeline(timeline: Record<string, unknown> | undefined): PreviewMeta | null {
  if (!timeline) return null;
  const durationInFrames = Number(timeline.durationInFrames);
  const fps = Number(timeline.fps);
  const width = Number(timeline.width);
  const height = Number(timeline.height);
  if (
    !Number.isFinite(durationInFrames) ||
    !Number.isFinite(fps) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return null;
  }
  return {
    durationInFrames: Math.max(1, Math.round(durationInFrames)),
    fps: Math.max(1, fps),
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
}

function clampInt(value: number, min: number, max: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/**
 * Map timeline workArea → Remotion Player in/out.
 * - No workArea: full composition (null/null)
 * - Remotion requires outFrame > inFrame and outFrame > 0
 */
function resolvePlayerPlayRange(
  workArea: unknown,
  durationInFrames: number,
): PlayRange {
  const maxFrame = Math.max(0, durationInFrames - 1);
  if (!workArea || typeof workArea !== "object" || Array.isArray(workArea)) {
    return { inFrame: null, outFrame: null };
  }

  const raw = workArea as Record<string, unknown>;
  let inFrame = clampInt(Number(raw.inFrame), 0, maxFrame);
  let outFrame = clampInt(Number(raw.outFrame), 0, maxFrame);
  if (inFrame > outFrame) {
    const swap = inFrame;
    inFrame = outFrame;
    outFrame = swap;
  }

  // Single-frame I/O: widen by 1 frame so Player validation passes.
  if (outFrame <= inFrame) {
    if (inFrame < maxFrame) {
      outFrame = inFrame + 1;
    } else if (maxFrame > 0) {
      inFrame = maxFrame - 1;
      outFrame = maxFrame;
    } else {
      return { inFrame: null, outFrame: null };
    }
  }

  if (outFrame <= 0) {
    return { inFrame: null, outFrame: null };
  }

  return { inFrame, outFrame };
}

export const PreviewApp: React.FC = () => {
  const playerRef = useRef<PlayerRef>(null);
  const resumeFrameRef = useRef(0);
  const canPostFramesRef = useRef(false);
  const [player, setPlayer] = useState<PlayerRef | null>(null);
  const [compositionKey, setCompositionKey] = useState(0);
  const [inputProps, setInputProps] = useState<EasymotionPreviewProps>({});
  const [previewMeta, setPreviewMeta] = useState<PreviewMeta>({
    durationInFrames: previewConfig.durationInFrames,
    fps: previewConfig.fps,
    width: previewConfig.width,
    height: previewConfig.height,
  });
  const [loop, setLoop] = useState(false);
  const [playRange, setPlayRange] = useState<PlayRange>({
    inFrame: null,
    outFrame: null,
  });

  const playRangeRef = useRef(playRange);
  playRangeRef.current = playRange;
  const durationRef = useRef(previewMeta.durationInFrames);
  durationRef.current = previewMeta.durationInFrames;

  const restorePlayhead = useCallback(
    (frame: number, target?: PlayerRef | null) => {
      resumeFrameRef.current = frame;
      canPostFramesRef.current = false;
      (target ?? playerRef.current)?.seekTo(frame);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          canPostFramesRef.current = true;
        });
      });
    },
    [],
  );

  const playFromCurrentOrRangeStart = useCallback((target: PlayerRef) => {
    const current = target.getCurrentFrame();
    const range = playRangeRef.current;
    const first = range.inFrame ?? 0;
    const last = range.outFrame ?? Math.max(0, durationRef.current - 1);
    // At/after out point, or before in point → restart from in (or composition start).
    if (current < first || current >= last) {
      restorePlayhead(first, target);
    }
    target.play();
  }, [restorePlayhead]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.channel !== CHANNEL) return;
      const target = playerRef.current;

      if (data.type === "RELOAD") {
        if (typeof data.frame === "number") {
          resumeFrameRef.current = data.frame;
        }
        canPostFramesRef.current = false;
        setCompositionKey((k) => k + 1);
        return;
      }

      if (data.type === "TIMELINE_UPDATE" && data.timeline) {
        if (typeof data.frame === "number") {
          resumeFrameRef.current = data.frame;
        }
        canPostFramesRef.current = false;
        const timeline = data.timeline as Record<string, unknown>;
        const nextMeta = metaFromTimeline(timeline);
        const durationInFrames =
          nextMeta?.durationInFrames ?? durationRef.current;
        if (nextMeta) {
          setPreviewMeta(nextMeta);
        }
        setPlayRange(resolvePlayerPlayRange(timeline.workArea, durationInFrames));
        setInputProps({ timeline });
        setCompositionKey((k) => k + 1);
        return;
      }

      if (data.type === "SET_PLAY_RANGE") {
        const durationInFrames = Math.max(
          1,
          Math.round(Number(data.durationInFrames) || durationRef.current),
        );
        durationRef.current = durationInFrames;
        setPreviewMeta((prev) =>
          prev.durationInFrames === durationInFrames
            ? prev
            : { ...prev, durationInFrames },
        );
        setPlayRange(
          resolvePlayerPlayRange(data.workArea ?? null, durationInFrames),
        );
        return;
      }

      if (data.type === "SET_LOOP" && typeof data.loop === "boolean") {
        setLoop(data.loop);
        return;
      }

      if (!target) return;

      if (data.type === "PLAY") playFromCurrentOrRangeStart(target);
      if (data.type === "PAUSE") target.pause();
      if (data.type === "SEEK" && typeof data.frame === "number") {
        restorePlayhead(data.frame, target);
      }
    };

    window.addEventListener("message", onMessage);
    window.parent.postMessage({ channel: CHANNEL, type: "READY" }, "*");
    return () => window.removeEventListener("message", onMessage);
  }, [playFromCurrentOrRangeStart, restorePlayhead]);

  useEffect(() => {
    if (!player) return;
    restorePlayhead(resumeFrameRef.current, player);
    player.pause();
    window.parent.postMessage(
      { channel: CHANNEL, type: "PLAYBACK_STATE", playing: false },
      "*",
    );
  }, [player, compositionKey, restorePlayhead]);

  useEffect(() => {
    if (!player) return;

    const onFrameUpdate: CallbackListener<"frameupdate"> = (e) => {
      const frame = e.detail.frame;
      if (!canPostFramesRef.current && frame !== resumeFrameRef.current) {
        return;
      }
      if (frame === resumeFrameRef.current) {
        canPostFramesRef.current = true;
      }
      window.parent.postMessage(
        { channel: CHANNEL, type: "FRAME_CHANGE", frame },
        "*",
      );
    };

    const onPlay: CallbackListener<"play"> = () => {
      window.parent.postMessage(
        { channel: CHANNEL, type: "PLAYBACK_STATE", playing: true },
        "*",
      );
    };

    const onPause: CallbackListener<"pause"> = () => {
      window.parent.postMessage(
        { channel: CHANNEL, type: "PLAYBACK_STATE", playing: false },
        "*",
      );
    };

    player.addEventListener("frameupdate", onFrameUpdate);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    return () => {
      player.removeEventListener("frameupdate", onFrameUpdate);
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
    };
  }, [player]);

  return (
    <div
      style={{
        backgroundColor: "#121212",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Player
        key={compositionKey}
        ref={(instance) => {
          playerRef.current = instance;
          setPlayer(instance);
          if (instance) {
            restorePlayhead(resumeFrameRef.current, instance);
          }
        }}
        component={MainSequence}
        durationInFrames={previewMeta.durationInFrames}
        fps={previewMeta.fps}
        compositionWidth={previewMeta.width}
        compositionHeight={previewMeta.height}
        style={{ width: "100%", maxHeight: "100%" }}
        controls={false}
        loop={loop}
        moveToBeginningWhenEnded={false}
        inFrame={playRange.inFrame}
        outFrame={playRange.outFrame}
        acknowledgeRemotionLicense
        inputProps={inputProps}
      />
    </div>
  );
};
