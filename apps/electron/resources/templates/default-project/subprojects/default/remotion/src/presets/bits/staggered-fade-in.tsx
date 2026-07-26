/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/staggered-motion/StaggeredFadeIn.tsx
 */

import React from "react";
import { AbsoluteFill } from "remotion";
import { StaggeredMotion } from "remotion-bits";

const boxStyle: React.CSSProperties = {
  width: 150,
  height: 150,
  borderRadius: "12px",
  backgroundColor: "#3b82f6",
};

export function BitsStaggeredFadeIn(_props: Record<string, unknown> = {}) {
  return (
  <AbsoluteFill style={{ backgroundColor: "#0f172a", justifyContent: 'center', alignItems: 'center' }}>
      <StaggeredMotion
        transition={{
          opacity: [0, 1],
          y: [100, 0],
          duration: 30,
          stagger: 5,
          staggerDirection: "forward",
          easing: "easeOutCubic",
        }}
        style={{
          display: "flex",
          gap: "2rem",
        }}
      >
        <div style={{ ...boxStyle, backgroundColor: "#3b82f6" }} />
        <div style={{ ...boxStyle, backgroundColor: "#ef4444" }} />
        <div style={{ ...boxStyle, backgroundColor: "#10b981" }} />
        <div style={{ ...boxStyle, backgroundColor: "#f59e0b" }} />
        <div style={{ ...boxStyle, backgroundColor: "#8b5cf6" }} />
      </StaggeredMotion>
  </AbsoluteFill>
);
}
