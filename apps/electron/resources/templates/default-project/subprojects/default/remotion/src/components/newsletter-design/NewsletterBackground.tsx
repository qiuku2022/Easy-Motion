import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import {
  hasBackgroundStyleOverride,
  toBackgroundOverrideCss,
  type BackgroundStyleLike,
} from "../../lib/background-style-override";
import { COLORS, H, W } from "./theme";

export const NewsletterBackground: React.FC<{
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

  const drift1 = interpolate(frame, [0, 125], [0, 60], {
    extrapolateRight: "clamp",
  });
  const drift2 = interpolate(frame, [0, 125], [0, -45], {
    extrapolateRight: "clamp",
  });
  const breathe = interpolate(frame, [0, 62, 125], [1, 1.08, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.base, opacity: fadeIn }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 120% 80% at 50% 0%, #18181b 0%, ${COLORS.base} 70%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          width: W * 0.7,
          height: H * 0.85,
          left: W * 0.1 - drift1 * 0.3,
          top: H * 0.05 + drift2 * 0.2,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(99,102,241,0.35) 0%, rgba(99,102,241,0) 70%)`,
          transform: `scale(${breathe})`,
          filter: "blur(60px)",
        }}
      />

      <div
        style={{
          position: "absolute",
          width: W * 0.55,
          height: H * 0.7,
          right: W * 0.05 + drift2 * 0.4,
          bottom: H * 0.1 - drift1 * 0.2,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(139,92,246,0.3) 0%, rgba(139,92,246,0) 70%)`,
          transform: `scale(${breathe * 0.95})`,
          filter: "blur(80px)",
        }}
      />

      <div
        style={{
          position: "absolute",
          width: W * 0.4,
          height: H * 0.5,
          left: W * 0.35 + drift1 * 0.5,
          top: H * 0.4 + drift2 * 0.3,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(34,211,238,0.15) 0%, rgba(34,211,238,0) 70%)`,
          transform: `scale(${breathe * 1.02})`,
          filter: "blur(50px)",
        }}
      />

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,255,255,0.03) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
