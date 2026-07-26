/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/typewriter/VariableSpeedTypewriter.tsx
 */

import React from "react";
import { AbsoluteFill } from "remotion";
import { TypeWriter, useViewportRect } from "remotion-bits";

export function BitsVariableSpeedTypewriter(_props: Record<string, unknown> = {}) {
  const { vmin } = useViewportRect();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#09090b",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <TypeWriter
        text="Typing with errors and variable speed..."
        style={{
          fontSize: vmin * 6,
          fontFamily: "monospace",
          color: "#ff6b6b",
          fontWeight: "bold",
        }}
        typeSpeed={[2, 10, 2]}
        errorRate={0.1}
        errorCorrectDelay={10}
        cursor={<span>_</span>}
        blinkSpeed={20}
      />
    </AbsoluteFill>
  );
}
