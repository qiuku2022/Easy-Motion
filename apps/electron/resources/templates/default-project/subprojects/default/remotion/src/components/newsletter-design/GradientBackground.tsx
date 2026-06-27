import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import {
  hasBackgroundStyleOverride,
  toBackgroundOverrideCss,
  type BackgroundStyleLike,
} from "../../lib/background-style-override";
import { COLORS, H, W } from "./theme";

export const GradientBackground: React.FC<{
  style?: BackgroundStyleLike;
}> = ({ style }) => {
  if (hasBackgroundStyleOverride(style)) {
    return <AbsoluteFill style={toBackgroundOverrideCss(style)} />;
  }

  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const angle = interpolate(frame, [0, 125], [135, 165], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(${angle}deg, ${COLORS.base} 0%, #18181b 40%, #1e1b4b 100%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          width: W * 0.6,
          height: H * 0.8,
          left: W * 0.2,
          top: H * 0.1,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)`,
          filter: "blur(70px)",
        }}
      />

      <div
        style={{
          position: "absolute",
          width: W * 0.5,
          height: H * 0.6,
          right: W * 0.1,
          bottom: H * 0.15,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />
    </AbsoluteFill>
  );
};
