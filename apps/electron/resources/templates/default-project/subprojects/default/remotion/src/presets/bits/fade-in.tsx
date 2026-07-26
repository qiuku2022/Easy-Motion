/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/animated-text/FadeIn.tsx
 */

import React from "react";
import { AbsoluteFill } from "remotion";
import { AnimatedText } from "remotion-bits";

export function BitsFadeIn(_props: Record<string, unknown> = {}) {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#09090b",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AnimatedText
        transition={{ opacity: [0, 1] }}
        style={{ color: "#f4f4f5", fontSize: 96, fontWeight: 700 }}
      >
        Hello World
      </AnimatedText>
    </AbsoluteFill>
  );
}
