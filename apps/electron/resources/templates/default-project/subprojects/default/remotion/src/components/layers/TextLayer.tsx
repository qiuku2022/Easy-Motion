import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { applyKeyframesToClip } from "../../lib/apply-keyframes";
import { buildCenterAnchoredLayerStyle } from "../../lib/layer-anchor-style";
import { useLayerScreenPosition } from "../../lib/use-layer-screen-position";

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
  const screen = useLayerScreenPosition(
    resolved.transform.position.x,
    resolved.transform.position.y,
  );

  return (
    <div
      style={{
        ...buildCenterAnchoredLayerStyle(screen, {
          scale: resolved.transform.scale,
          rotation: resolved.transform.rotation,
          opacity,
        }),
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
