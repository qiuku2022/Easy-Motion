/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/gradient-transition/RadialGradient.tsx
 */

import React from "react";
import { GradientTransition } from "remotion-bits";

export function BitsRadialGradient(_props: Record<string, unknown> = {}) {
  return (
  <GradientTransition
    gradient={[
      "radial-gradient(circle at 20% 20%, #FDB813 0%, #78C0E0 60%)",
      "radial-gradient(circle at 80% 80%, #F5576C 0%, #2F2044 100%)",
    ]}
    duration={90}
  >
  </GradientTransition>
);
}
