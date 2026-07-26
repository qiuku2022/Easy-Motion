/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/animated-text/BlurSlideWord.tsx
 */

import React from "react";
import { AbsoluteFill } from "remotion";
import { AnimatedText } from "remotion-bits";

export function BitsBlurSlideWord(_props: Record<string, unknown> = {}) {
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
          y: [40, 0],
          blur: [10, 0],
          opacity: [0, 1],
          split: "word",
          splitStagger: 1,
          easing: "easeOutCubic",
        }}
        style={{
          fontWeight: "bold",
          color: "#f4f4f5",
          fontSize: 72,
        }}
      >
        Text Transition
      </AnimatedText>
    </AbsoluteFill>
  );
}
