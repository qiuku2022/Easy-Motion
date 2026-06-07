import React from "react";
import { Video } from "remotion";

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
  if (!src) return null;

  return (
    <Video
      src={src}
      style={{
        position: "absolute",
        left: transform.position.x,
        top: transform.position.y,
        width: "100%",
        height: "100%",
        transform: `translate(-50%, -50%) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
        opacity: transform.opacity,
        objectFit: style?.objectFit ?? "contain",
      }}
    />
  );
};
