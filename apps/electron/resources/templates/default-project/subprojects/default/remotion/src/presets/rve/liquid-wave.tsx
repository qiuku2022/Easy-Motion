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

import { useCurrentFrame, useVideoConfig } from "remotion";
import { type RveBaseProps, pColor } from "./shared";

export function RveLiquidWave(props: RveBaseProps = {}) {
  const primaryColor = pColor(props, "primaryColor", "#1e3a8a");
  const secondaryColor = pColor(props, "secondaryColor", "#3b82f6");
  const backgroundColor = pColor(props, "backgroundColor", "#111827");

  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const numberOfPoints = 50;
  const points = Array.from({ length: numberOfPoints + 1 }).map((_, i) => {
    const x = (i / numberOfPoints) * width;
    const waveHeight = Math.sin(frame / 20 + i / 5) * 50;
    const y = height / 2 + waveHeight;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} style={{ background: backgroundColor }}>
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={primaryColor} />
          <stop offset="100%" stopColor={secondaryColor} />
        </linearGradient>
      </defs>
      <path
        d={`M 0,${height} ${points.join(" ")} ${width},${height} Z`}
        fill="url(#gradient)"
        style={{
          filter: "blur(10px)",
        }}
      />
    </svg>
  );
}
