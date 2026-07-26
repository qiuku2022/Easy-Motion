/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/typewriter/BasicTypewriter.tsx
 */

import React from "react";
import { AbsoluteFill } from "remotion";
import { TypeWriter, useViewportRect } from "remotion-bits";

export function BitsBasicTypewriter(_props: Record<string, unknown> = {}) {
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
        text="Ah, those sunny days!"
        style={{
          fontSize: vmin * 8,
          color: "#f4f4f5",
          fontWeight: 600,
        }}
        cursor={true}
      />
    </AbsoluteFill>
  );
}
