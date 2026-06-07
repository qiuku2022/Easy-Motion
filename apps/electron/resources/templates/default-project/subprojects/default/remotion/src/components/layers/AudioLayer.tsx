import React from "react";
import { Audio } from "remotion";

type AudioLayerProps = {
  clipId: string;
  src: string;
  transform?: {
    position: { x: number; y: number };
    scale: number;
    rotation: number;
    opacity: number;
  };
};

export const AudioLayer: React.FC<AudioLayerProps> = ({ src }) => {
  if (!src) return null;
  return <Audio src={src} />;
};
