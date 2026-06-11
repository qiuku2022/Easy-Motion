import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
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

const PreviewApp: React.FC = () => {
  const playerRef = useRef<PlayerRef>(null);
  const [player, setPlayer] = useState<PlayerRef | null>(null);
  const [compositionKey, setCompositionKey] = useState(0);
  const [inputProps, setInputProps] = useState<EasymotionPreviewProps>({});
  const [loop, setLoop] = useState(true);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.channel !== CHANNEL) return;
      const target = playerRef.current;

      if (data.type === "RELOAD") {
        setCompositionKey((k) => k + 1);
        return;
      }

      if (data.type === "TIMELINE_UPDATE" && data.timeline) {
        setInputProps({ timeline: data.timeline });
        setCompositionKey((k) => k + 1);
        return;
      }

      if (data.type === "SET_LOOP" && typeof data.loop === "boolean") {
        setLoop(data.loop);
        return;
      }

      if (!target) return;

      if (data.type === "PLAY") target.play();
      if (data.type === "PAUSE") target.pause();
      if (data.type === "SEEK" && typeof data.frame === "number") {
        target.seekTo(data.frame);
      }
    };

    window.addEventListener("message", onMessage);
    window.parent.postMessage({ channel: CHANNEL, type: "READY" }, "*");
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!player) return;

    const onFrameUpdate: CallbackListener<"frameupdate"> = (e) => {
      window.parent.postMessage(
        { channel: CHANNEL, type: "FRAME_CHANGE", frame: e.detail.frame },
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
    player.addEventListener("pause", onPause);
    return () => {
      player.removeEventListener("frameupdate", onFrameUpdate);
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
        }}
        component={MainSequence}
        durationInFrames={previewConfig.durationInFrames}
        fps={previewConfig.fps}
        compositionWidth={previewConfig.width}
        compositionHeight={previewConfig.height}
        style={{ width: "100%", maxHeight: "100%" }}
        controls={false}
        loop={loop}
        acknowledgeRemotionLicense
        inputProps={inputProps}
      />
    </div>
  );
};

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<PreviewApp />);
}
