import React from "react";
import { AbsoluteFill } from "remotion";
import { PRESET_COMPONENT_MAP } from "./registry";

export type PresetThumbnailProps = {
  component: string;
};

export const PresetThumbnailComposition: React.FC<PresetThumbnailProps> = ({
  component,
}) => {
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
    <AbsoluteFill style={{ backgroundColor: "#121212" }}>
      <PresetComponent />
    </AbsoluteFill>
  );
};
