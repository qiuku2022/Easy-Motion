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

export function RveSoundWave(props: RveBaseProps = {}) {
  const primaryColor = pColor(props, "primaryColor", "#3b82f6");
  const backgroundColor = pColor(props, "backgroundColor", "#111827");
  const value = pNum(props, "value", 40);

  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const BAR_COUNT = value;
  const bars = Array.from({ length: BAR_COUNT }).map((_, i) => {
    const seed = i * 1000;
    const height =
      Math.abs(Math.sin(frame / 10 + i / 2)) * 100 + random(seed) * 50;

    return {
      height,
      hue: (i / BAR_COUNT) * 180 + frame,
    };
  });

  return (
    <div
      style={{
        width,
        height,

        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        backdropFilter: "blur(8px)",
        boxShadow: "inset 0 0 100px rgba(59, 130, 246, 0.2)",
      }}
    >
      {bars.map((bar, i) => (
        <div
          key={i}
          style={{
            width: "12px",
            height: `${bar.height}px`,
            background: `white`,
            borderRadius: "6px",
            transition: "height 0.1s ease",
            boxShadow: `0 0 10px rgba(59, 130, 246, 0.6)`,
          }}
        />
      ))}
    </div>
  );
}
