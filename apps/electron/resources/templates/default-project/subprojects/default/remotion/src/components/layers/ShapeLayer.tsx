import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { applyKeyframesToClip } from "../../lib/apply-keyframes";
import { buildCenterAnchoredLayerStyle } from "../../lib/layer-anchor-style";
import { useLayerScreenPosition } from "../../lib/use-layer-screen-position";

type ShapeLayerProps = {
  clipId: string;
  source: {
    kind: "inline";
    shape: "rect" | "circle";
    width?: number;
    height?: number;
    radius?: number;
  };
  transform: {
    position: { x: number; y: number };
    scale: number;
    rotation: number;
    opacity: number;
  };
  style?: {
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    background?: string;
    backgroundImage?: string;
  };
  keyframes?: Parameters<typeof applyKeyframesToClip>[0]["keyframes"];
};

export const ShapeLayer: React.FC<ShapeLayerProps> = ({
  source,
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

  const width = source.width ?? 200;
  const height = source.height ?? 200;

  const fillPaint: React.CSSProperties = resolved.style?.background
    ? { background: String(resolved.style.background) }
    : resolved.style?.backgroundImage
      ? { backgroundImage: String(resolved.style.backgroundImage) }
      : { backgroundColor: String(resolved.style?.fillColor ?? "#e11d48") };

  const shapeStyle: React.CSSProperties =
    source.shape === "circle"
      ? {
          width: (source.radius ?? 100) * 2,
          height: (source.radius ?? 100) * 2,
          borderRadius: "50%",
          ...fillPaint,
        }
      : {
          width,
          height,
          border: resolved.style?.strokeColor
            ? `${resolved.style.strokeWidth ?? 1}px solid ${resolved.style.strokeColor}`
            : undefined,
          ...fillPaint,
        };

  const screen = useLayerScreenPosition(
    resolved.transform.position.x,
    resolved.transform.position.y,
  );

  return (
    <div
      style={{
        ...buildCenterAnchoredLayerStyle(screen, resolved.transform),
        ...shapeStyle,
      }}
    />
  );
};
