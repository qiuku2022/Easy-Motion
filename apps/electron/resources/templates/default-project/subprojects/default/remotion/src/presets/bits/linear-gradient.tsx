/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/gradient-transition/LinearGradient.tsx
 */

import React from "react";
import { GradientTransition } from "remotion-bits";

const defaultProps = {
  color1Start: "#051226",
  color1End: "#1e0541",
  color2Start: "#a5d4dd",
  color2End: "#5674b1",
  angle1: 0,
  angle2: 180,
};

export function BitsLinearGradient(incoming: Record<string, unknown> = {}) {
  const props = { ...defaultProps, ...incoming };
  return (
  <GradientTransition
    gradient={[
      `linear-gradient(${props.angle1}deg, ${props.color1Start} 0%, ${props.color1End} 100%)`,
      `linear-gradient(${props.angle2}deg, ${props.color2Start} 0%, ${props.color2End} 100%)`,
    ]}
    duration={90}
  >
  </GradientTransition>
);
}
