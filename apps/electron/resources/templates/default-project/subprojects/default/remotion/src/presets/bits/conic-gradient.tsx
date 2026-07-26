/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/gradient-transition/ConicGradient.tsx
 */

import React from "react";
import { GradientTransition } from "remotion-bits";

export function BitsConicGradient(_props: Record<string, unknown> = {}) {
  return (
  <GradientTransition
    gradient={[
      "conic-gradient(from 0deg, #000000, #009900)",
      "conic-gradient(from 359deg, #000000, #009900)",
    ]}
    easing="linear"
    shortestAngle={false}
    duration={60}
  />
);
}
