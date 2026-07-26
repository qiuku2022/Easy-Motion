/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/staggered-motion/GridStagger.tsx
 */

import React from "react";
import { StaggeredMotion, useViewportRect } from "remotion-bits";

export function BitsGridStagger(_props: Record<string, unknown> = {}) {
  const rect = useViewportRect();

  // Create a 4x4 grid
  const cols = 4;
  const rows = 4;
  const count = cols * rows;
  const gap = 20; // 20px gap

  // Calculate item size based on available width/height
  const padding = 60;
  const availableWidth = rect.width - (padding * 2) - (gap * (cols - 1));
  const availableHeight = rect.height - (padding * 2) - (gap * (rows - 1));

  // Use the smaller dimension to keep squares
  const itemSize = Math.min(availableWidth / cols, availableHeight / rows);

  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#09090b", // zinc-950
        color: "#e4e4e7", // zinc-200
        overflow: "hidden",
      }}
    >
      <StaggeredMotion
        transition={{
          scale: [0, 1],
          opacity: [0, 1],
          frames: [0, 45],
          stagger: 3,
          staggerDirection: "center",
          easing: "spring",
        }}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${itemSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${itemSize}px)`,
          gap: gap,
        }}
      >
        {items.map((i) => (
          <div
            key={i}
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: "#6366f1",
              borderRadius: Math.max(8, itemSize * 0.2),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: Math.max(12, itemSize * 0.3),
              fontWeight: "bold",
              color: "rgba(255,255,255,0.9)",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            }}
          >
            {i + 1}
          </div>
        ))}
      </StaggeredMotion>
    </div>
  );
}
