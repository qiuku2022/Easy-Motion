/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/typewriter/MultiTextTypewriter.tsx
 */

import React from "react";
import { AbsoluteFill } from "remotion";
import { TypeWriter, useViewportRect } from "remotion-bits";

export function BitsMultitextTypewriter(_props: Record<string, unknown> = {}) {
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
        text={["First sentence.", "Second longer sentence.", "Looping..."]}
        style={{
          fontSize: vmin * 7,
          fontWeight: "bold",
          fontFamily: "monospace",
          color: "#f4f4f5",
        }}
        typeSpeed={3}
        deleteSpeed={1}
        pauseAfterType={40}
        pauseAfterDelete={20}
        loop
      />
    </AbsoluteFill>
  );
}
