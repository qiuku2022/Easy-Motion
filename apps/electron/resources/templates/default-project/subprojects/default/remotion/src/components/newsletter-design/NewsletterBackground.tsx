import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, H, W } from "./theme";

export const NewsletterBackground: React.FC = () => {
  const frame = useCurrentFrame();

  const drift1 = interpolate(frame, [0, 125], [0, 48], {
    extrapolateRight: "clamp",
  });
  const drift2 = interpolate(frame, [0, 125], [0, -36], {
    extrapolateRight: "clamp",
  });
  const breathe = interpolate(frame, [0, 62, 125], [1, 1.06, 1], {
    extrapolateRight: "clamp",
  });
  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.mintLight, opacity: fadeIn }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(135deg, ${COLORS.mintLight} 0%, ${COLORS.mint} 55%, ${COLORS.mintLight} 100%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          width: W * 0.85,
          height: H * 1.1,
          right: -W * 0.12 + drift1,
          top: -H * 0.08 + drift2,
          borderRadius: "42% 58% 55% 45% / 48% 42% 58% 52%",
          background: `radial-gradient(circle at 35% 40%, ${COLORS.limeSoft} 0%, ${COLORS.lime} 55%, #A8D830 100%)`,
          transform: `scale(${breathe}) rotate(-8deg)`,
          filter: "blur(2px)",
        }}
      />

      <div
        style={{
          position: "absolute",
          width: W * 0.55,
          height: H * 0.9,
          right: W * 0.05 - drift2 * 0.5,
          bottom: -H * 0.15,
          borderRadius: "60% 40% 45% 55% / 52% 48% 52% 48%",
          background: `radial-gradient(circle at 50% 50%, rgba(200,240,32,0.55) 0%, rgba(168,216,48,0.2) 70%, transparent 100%)`,
          transform: `scale(${breathe * 0.98}) rotate(12deg)`,
          filter: "blur(40px)",
        }}
      />

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 50%, rgba(255,255,255,0.35) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
