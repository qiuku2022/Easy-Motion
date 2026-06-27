import React from "react";
import { Video, useVideoConfig } from "remotion";
import { buildCenterAnchoredLayerStyle } from "../../lib/layer-anchor-style";
import { useLayerScreenPosition } from "../../lib/use-layer-screen-position";

type VideoLayerProps = {
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
};

export const VideoLayer: React.FC<VideoLayerProps> = ({ src, transform, style }) => {
  const { width, height } = useVideoConfig();

  if (!src) return null;

  const screen = useLayerScreenPosition(transform.position.x, transform.position.y);

  return (
    <div style={buildCenterAnchoredLayerStyle(screen, transform)}>
      <Video
        src={src}
        style={{
          maxWidth: width,
          maxHeight: height,
          objectFit: style?.objectFit ?? "contain",
        }}
      />
    </div>
  );
};
