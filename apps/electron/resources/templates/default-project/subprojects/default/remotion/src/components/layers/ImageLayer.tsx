import React, { useMemo } from "react";
import { Img, useCurrentFrame, useVideoConfig } from "remotion";
import { applyKeyframesToClip } from "../../lib/apply-keyframes";
import { buildCenterAnchoredLayerStyle } from "../../lib/layer-anchor-style";
import { useLayerScreenPosition } from "../../lib/use-layer-screen-position";

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

  const screen = useLayerScreenPosition(
    resolved.transform.position.x,
    resolved.transform.position.y,
  );

  return (
    <Img
      src={src}
      style={{
        ...buildCenterAnchoredLayerStyle(screen, resolved.transform),
        objectFit: (resolved.style?.objectFit as "cover" | "contain" | "fill" | undefined) ?? "cover",
      }}
    />
  );
};
