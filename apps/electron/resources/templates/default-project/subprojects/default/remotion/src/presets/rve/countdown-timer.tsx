/**
 * Vendored from reactvideoeditor/remotion-templates (MIT)
 * https://github.com/reactvideoeditor/remotion-templates
 */

/** Free Remotion Template Component
 * ---------------------------------
 * This template is free to use in your projects!
 * Credit appreciated but not required.
 *
 * Created by the team at https://www.reactvideoeditor.com
 *
 * Happy coding and building amazing videos! 🎉
 */

import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { type RveBaseProps, pNum, pText, pColor } from "./shared";

export function RveCountdownTimer(props: RveBaseProps = {}) {
  const value = pNum(props, "value", 5);
  const text = pText(props, "text", "GO");
  const primaryColor = pColor(props, "primaryColor", "#3b82f6");
  const backgroundColor = pColor(props, "backgroundColor", "#111827");

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const framesPerNumber = Math.floor(fps * 0.8);
  const totalNumbers = 6; // 5, 4, 3, 2, 1, GO
  const currentIndex = Math.min(
    Math.floor(frame / framesPerNumber),
    totalNumbers - 1
  );
  const frameInSegment = frame - currentIndex * framesPerNumber;

  const numbers = ["5", "4", "3", "2", "1", text];
  const currentLabel = numbers[currentIndex];

  const scale = spring({
    frame: frameInSegment,
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.5 },
  });

  const fadeInEnd = Math.max(1, Math.floor(framesPerNumber * 0.15));
  const fadeOutStart = Math.max(fadeInEnd + 1, framesPerNumber - Math.floor(framesPerNumber * 0.25));

  const opacity = interpolate(
    frameInSegment,
    [0, fadeInEnd, fadeOutStart, framesPerNumber],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" }
  );

  const isGo = currentIndex === totalNumbers - 1;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: backgroundColor,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          opacity: isGo ? 1 : opacity,
          fontSize: isGo ? "8rem" : "10rem",
          fontWeight: "bold",
          fontFamily: "Inter, sans-serif",
          color: "white",
          background: isGo
            ? "linear-gradient(135deg, #3b82f6, #7209b7)"
            : "none",
          WebkitBackgroundClip: isGo ? "text" : undefined,
          WebkitTextFillColor: isGo ? "transparent" : undefined,
          textAlign: "center",
          lineHeight: 1,
        }}
      >
        {currentLabel}
      </div>
    </div>
  );
}
