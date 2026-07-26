/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/animated-text/CharByChar.tsx
 */

import React from "react";
import { AbsoluteFill } from "remotion";
import { AnimatedText } from "remotion-bits";

export function BitsCharByChar(_props: Record<string, unknown> = {}) {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#09090b",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AnimatedText
        transition={{
          opacity: [0, 1],
          scale: [0.7, 1],
          y: [15, 0],
          duration: 10,
          split: "character",
          splitStagger: 1,
          easing: "easeOutCubic",
        }}
        style={{ color: "#f4f4f5", fontSize: 72, fontWeight: 700 }}
      >
        Character Animation
      </AnimatedText>
    </AbsoluteFill>
  );
}
