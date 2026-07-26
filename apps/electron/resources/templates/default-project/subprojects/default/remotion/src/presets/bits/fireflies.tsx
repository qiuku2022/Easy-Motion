/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/particle-system/Fireflies.tsx
 */

import React from "react";
import { Particles, Spawner, Behavior, useViewportRect, StaggeredMotion } from "remotion-bits";

export function BitsFireflies(_props: Record<string, unknown> = {}) {
  const rect = useViewportRect();

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#020617",
        position: "relative",
      }}
    >
    <Particles>
      <Spawner
        rate={0.2}
        max={200}
        area={{ width: rect.width, height: rect.height }}
        position={{ x: rect.width / 2, y: rect.height / 2 }}
        lifespan={100}
        velocity={{ x: 0.5, y: 0.5, varianceX: 1, varianceY: 1 }}
      >
        <StaggeredMotion
          transition={{
            opacity: [0, 1, 0],
          }}
        >
          <div
            style={{
              width: Math.max(4, rect.vmin),
              height: Math.max(4, rect.vmin),
              borderRadius: "50%",
              backgroundColor: "#ccff00",
              boxShadow: `0 0 ${rect.vmin * 2}px ${rect.vmin * 1}px #ccff0099`,
            }}
          />
        </StaggeredMotion>
      </Spawner>

      <Behavior
        wiggle={{ magnitude: 2, frequency: 0.1 }}
        wiggleVariance={1}
      />
    </Particles>
    </div>
  );
};
