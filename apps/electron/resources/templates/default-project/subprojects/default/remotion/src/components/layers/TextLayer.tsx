import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { applyKeyframesToClip } from "../lib/apply-keyframes";

type Transform = {
  position: { x: number; y: number };
  scale: number;
  rotation: number;
  opacity: number;
};

type TextLayerProps = {
  clipId: string;
  source: { kind: "inline"; content: string };
  transform: Transform;
  style: {
    fontFamily: string;
    fontSize: number;
    color: string;
    textAlign?: "left" | "center" | "right";
  };
  keyframes?: Parameters<typeof applyKeyframesToClip>[0]["keyframes"];
  inAnimation?: { type: string; durationInFrames: number };
};

export const TextLayer: React.FC<TextLayerProps> = ({
  source,
  transform,
  style,
  keyframes = [],
  inAnimation,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const resolved = useMemo(
    () =>
      applyKeyframesToClip({ transform, style, keyframes }, frame, fps) as {
        transform: Transform;
        style: TextLayerProps["style"];
      },
    [frame, fps, transform, style, keyframes],
  );

  const fadeIn =
    inAnimation?.type === "fade"
      ? interpolate(frame, [0, inAnimation.durationInFrames], [0, 1], {
          extrapolateRight: "clamp",
        })
      : 1;

  const opacity = resolved.transform.opacity * fadeIn;

  return (
    <div
      style={{
        position: "absolute",
        left: resolved.transform.position.x,
        top: resolved.transform.position.y,
        transform: `translate(-50%, -50%) scale(${resolved.transform.scale}) rotate(${resolved.transform.rotation}deg)`,
        opacity,
        color: resolved.style.color,
        fontFamily: resolved.style.fontFamily,
        fontSize: resolved.style.fontSize,
        textAlign: resolved.style.textAlign ?? "center",
        whiteSpace: "pre-wrap",
      }}
    >
      {source.content}
    </div>
  );
};
