/**
 * Vendored from reactvideoeditor/remotion-templates (MIT)
 * https://github.com/reactvideoeditor/remotion-templates
 */

/**
 * Free Remotion Template Component
 * ---------------------------------
 * This template is free to use in your projects!
 * Credit appreciated but not required.
 *
 * Created by the team at https://www.reactvideoeditor.com
 *
 * Happy coding and building amazing videos! 🎉
 */

import { random, useCurrentFrame, useVideoConfig } from "remotion";
import { type RveBaseProps, pColor, pNum } from "./shared";

export function RvePixelTransition(props: RveBaseProps = {}) {
  const primaryColor = pColor(props, "primaryColor", "#3b82f6");
  const backgroundColor = pColor(props, "backgroundColor", "#0f172a");
  const value = pNum(props, "value", 20);

  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Pixel size
  const pixelSize = value;

  // Calculate grid dimensions
  const cols = Math.ceil(width / pixelSize);
  const rows = Math.ceil(height / pixelSize);

  // Create pixel grid
  const pixels = [];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // Use random seed based on position for consistent randomness
      const seed = x * 1000 + y;

      // Random frame delay for each pixel
      const delay = Math.floor(random(seed) * 60);

      // Determine if pixel should be visible based on frame
      const isVisible = frame > delay;

      // Random color for each pixel
      const hue = Math.floor(random(seed * 2) * 220) + 200;
      const saturation = 70 + Math.floor(random(seed * 3) * 30);
      const lightness = 40 + Math.floor(random(seed * 4) * 20);

      if (isVisible) {
        pixels.push({
          x: x * pixelSize,
          y: y * pixelSize,
          color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
        });
      }
    }
  }

  return (
    <div
      style={{
        width,
        height,
        background: backgroundColor,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {pixels.map((pixel, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: pixel.x,
            top: pixel.y,
            width: pixelSize,
            height: pixelSize,
            backgroundColor: pixel.color,
            transition: "opacity 0.2s ease",
          }}
        />
      ))}
    </div>
  );
}
