/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/animated-text/WordByWord.tsx
 */

import React from "react";
import { AbsoluteFill } from "remotion";
import { AnimatedText } from "remotion-bits";

export function BitsWordByWord(_props: Record<string, unknown> = {}) {
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
          y: [20, 0],
          opacity: [0, 1],
          split: "word",
          splitStagger: 3,
          easing: "easeOutQuad",
        }}
        style={{ color: "#f4f4f5", fontSize: 64, fontWeight: 600 }}
      >
        This appears word by word
      </AnimatedText>
    </AbsoluteFill>
  );
}
