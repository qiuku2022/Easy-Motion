import React from "react";
import { AbsoluteFill } from "remotion";
import { PRESET_COMPONENT_MAP } from "./registry";

export type PresetThumbnailProps = {
  component: string;
};

/**
 * Thumbnails render at full composition size (1920×1080).
 * Bits presets use useViewportRect()/useVideoConfig() — nesting a scaled
 * 1920 box inside a 320×180 composition made layouts tiny or zero-height.
 * Downscale to 320×180 happens in ffmpeg after stills are captured.
 *
 * Many Bits demos leave large empty margins (Scene3D / particles). Zoom Bits
 * slightly so card thumbnails keep readable subject after 320×180 downscale.
 */
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
          fontSize: 48,
          fontFamily: "sans-serif",
        }}
      >
        {component}
      </AbsoluteFill>
    );
  }

  // Bits demos assume docs-site tokens; without them text/borders collapse to black.
  const bitsThemeVars = {
    ["--color-background-dark" as string]: "#09090b",
    ["--color-primary" as string]: "#8b5cf6",
    ["--color-primary-hover" as string]: "#c4b5fd",
    ["--color-surface-light" as string]: "#3f3f46",
    ["--color-surface-dark" as string]: "#18181b",
    ["--color-border-light" as string]: "#52525b",
  };

  const isBits = component.startsWith("Bits");
  // Particle / full-bleed demos need less zoom; sparse Scene3D demos need more.
  const zoom = isBits
    ? /Flying|Scrolling|Carousel|KenBurns|Cursor|Fracture|Mosaic|CardStack/i.test(
        component
      )
      ? 1.35
      : 1.75
    : 1;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#121212",
        color: "#f4f4f5",
        overflow: "hidden",
        ...bitsThemeVars,
      }}
    >
      <AbsoluteFill
        style={{
          transform: zoom === 1 ? undefined : `scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        <PresetComponent />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
