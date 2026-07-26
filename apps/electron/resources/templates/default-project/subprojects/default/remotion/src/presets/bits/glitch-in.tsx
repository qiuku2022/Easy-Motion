/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/animated-text/GlitchIn.tsx
 */

import React from "react";
import { AbsoluteFill } from "remotion";
import { AnimatedText } from "remotion-bits";

export function BitsGlitchIn(_props: Record<string, unknown> = {}) {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#050505",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AnimatedText
        style={{
          fontFamily: "monospace",
          color: "#22c55e",
          fontSize: 72,
          fontWeight: 700,
        }}
        transition={{
          glitch: [1, 0, 0.05, 0],
          duration: 45,
          opacity: [0, 1],
          frames: [0, 45],
        }}
      >
        SYSTEM ONLINE
      </AnimatedText>
    </AbsoluteFill>
  );
}
