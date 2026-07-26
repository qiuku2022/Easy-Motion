/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/animated-text/GlitchCycle.tsx
 */

import React from "react";
import { AbsoluteFill } from "remotion";
import { AnimatedText } from "remotion-bits";

export function BitsGlitchCycle(_props: Record<string, unknown> = {}) {
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
          fontSize: 64,
          fontWeight: 700,
        }}
        transition={{
          glitch: [1, 0, 0, 0.1, 0, 0, 1],
          duration: 60,
          cycle: {
            texts: ["INITIALIZING", "LOADING ASSETS", "SYSTEM ONLINE", "WELCOME USER"],
            itemDuration: 60,
          },
        }}
      />
    </AbsoluteFill>
  );
}
