/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/animated-counter/BasicCounter.tsx
 */

import React from "react";
import { AbsoluteFill } from "remotion";
import { AnimatedCounter } from "remotion-bits";

export function BitsBasicCounter(_props: Record<string, unknown> = {}) {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#09090b",
        alignItems: "center",
        justifyContent: "center",
        color: "#f4f4f5",
        fontSize: 72,
        fontWeight: 700,
      }}
    >
      <AnimatedCounter
        style={{ width: 480 }}
        transition={{
          values: [0, 10, 10, 50, 10],
          duration: 120,
        }}
        prefix={<span style={{ color: "currentColor" }}>width:&nbsp;</span>}
        postfix={<span style={{ color: "currentColor" }}>px</span>}
      />
    </AbsoluteFill>
  );
}
