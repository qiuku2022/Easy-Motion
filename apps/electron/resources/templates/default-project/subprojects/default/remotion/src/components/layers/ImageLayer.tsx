import React, { useMemo } from "react";
import { Img, useCurrentFrame, useVideoConfig } from "remotion";
import { applyKeyframesToClip } from "../../lib/apply-keyframes";

type ImageLayerProps = {
  clipId: string;
  src: string;
  transform: {
    position: { x: number; y: number };
    scale: number;
    rotation: number;
    opacity: number;
  };
  style?: {
    objectFit?: "cover" | "contain" | "fill";
  };
  keyframes?: Parameters<typeof applyKeyframesToClip>[0]["keyframes"];
};

export const ImageLayer: React.FC<ImageLayerProps> = ({
  src,
  transform,
  style,
  keyframes = [],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const resolved = useMemo(
    () => applyKeyframesToClip({ transform, style, keyframes }, frame, fps),
    [frame, fps, transform, style, keyframes],
  );

  if (!src) return null;

  return (
    <Img
      src={src}
      style={{
        position: "absolute",
        left: resolved.transform.position.x,
        top: resolved.transform.position.y,
        transform: `translate(-50%, -50%) scale(${resolved.transform.scale}) rotate(${resolved.transform.rotation}deg)`,
        opacity: resolved.transform.opacity,
        objectFit: (resolved.style?.objectFit as "cover" | "contain" | "fill" | undefined) ?? "cover",
      }}
    />
  );
};
