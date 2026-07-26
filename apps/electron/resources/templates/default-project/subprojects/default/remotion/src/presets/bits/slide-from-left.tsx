/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/staggered-motion/SlideFromLeft.tsx
 */

import React from "react";
import { AbsoluteFill } from "remotion";
import { AnimatedText } from "remotion-bits";

export function BitsSlideFromLeft(_props: Record<string, unknown> = {}) {
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
          x: [-400, 0],
          easing: "easeInOut",
        }}
        style={{
          color: "#f4f4f5",
          fontSize: 96,
          fontWeight: 700,
        }}
      >
        Sliding Text
      </AnimatedText>
    </AbsoluteFill>
  );
}
