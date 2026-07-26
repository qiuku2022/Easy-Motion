/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/staggered-motion/CardStack.tsx
 */

import React from "react";
import { StaggeredMotion, useViewportRect } from "remotion-bits";

export function BitsCardStack(_props: Record<string, unknown> = {}) {
  const { vmin } = useViewportRect();

  const cardWidth = vmin * 30;
  const cardHeight = cardWidth * 1.5;
  const count = 8;
  const cards = Array.from({ length: count }, (_, i) => i);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#09090b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
    <div style={{ position: "relative", width: cardWidth, height: cardHeight, transformStyle: "preserve-3d" }}>
      <StaggeredMotion
        transition={{
          y: [800, 0],
          frames: [0, 50],
          stagger: 3,
          easing: "spring",
        }}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          top: 0,
          left: 0,
          transformStyle: "preserve-3d",
          pointerEvents: "none",
        }}
      >
        {cards.map((i) => {
          // Calculate final static position for "fanned out" look
          const angle = (i - (count - 1) / 2) * 8;
          const xOffset = (i - (count - 1) / 2) * 60;
          const zOffset = i * -10; // Stack depth

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transformStyle: "preserve-3d",
                zIndex: -i, // Ensure correct stacking order
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: i % 2 === 0 ? "#f6a45c" : "#68431e",
                  borderRadius: 24,
                  border: "4px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: cardWidth * 0.4,
                  transform: `translateZ(${zOffset}px) translateX(${xOffset}px) rotateZ(${angle}deg)`,
                }}
              >
                {i + 1}
              </div>
            </div>
          );
        })}
      </StaggeredMotion>
    </div>
    </div>
  );
}
