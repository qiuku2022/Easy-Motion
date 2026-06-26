import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { PRESET_COMPONENT_MAP } from "./registry";

/** RVE 预设按全高清画布布局，缩略图需整体缩放后才不会裁切 */
const REFERENCE_WIDTH = 1920;
const REFERENCE_HEIGHT = 1080;

export type PresetThumbnailProps = {
  component: string;
};

export const PresetThumbnailComposition: React.FC<PresetThumbnailProps> = ({
  component,
}) => {
  const { width, height } = useVideoConfig();
  const scale = Math.min(width / REFERENCE_WIDTH, height / REFERENCE_HEIGHT);

  const PresetComponent = PRESET_COMPONENT_MAP[component];
  if (!PresetComponent) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#121212",
          color: "#a3a3a3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontFamily: "sans-serif",
        }}
      >
        {component}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#121212",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: REFERENCE_WIDTH,
          height: REFERENCE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <PresetComponent />
      </div>
    </AbsoluteFill>
  );
};
