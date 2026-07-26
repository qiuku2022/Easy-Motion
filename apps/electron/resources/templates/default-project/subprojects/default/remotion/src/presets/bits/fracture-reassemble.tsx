/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/staggered-motion/FractureReassemble.tsx
 */

import React from "react";
import { StaggeredMotion, useViewportRect, randomFloat, hold } from "remotion-bits";

export function BitsFractureReassemble(_props: Record<string, unknown> = {}) {
  const TILE_COLORS = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#f43f5e",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#14b8a6",
    "#06b6d4",
    "#3b82f6",
    "#a855f7",
    "#d946ef",
  ];

  const ROWS = 5;
  const COLS = 5;
  const CENTER_ROW = 2;
  const SYMBOLS = ["◈", "◉", "◎", "◍", "◌"];

  const rect = useViewportRect();
  const vmin = rect.vmin;

  const gap = vmin * 1.2;
  const tileSize = vmin * 14;
  const gridWidth = COLS * tileSize + (COLS - 1) * gap;
  const gridHeight = ROWS * tileSize + (ROWS - 1) * gap;

  const tiles = Array.from({ length: ROWS * COLS }, (_, i) => {
    const row = Math.floor(i / COLS);
    const col = i % COLS;

    const dx = randomFloat(`frac-x-${i}`, -vmin * 80, vmin * 80);
    const dy = randomFloat(`frac-y-${i}`, -vmin * 80, vmin * 80);
    const dz = randomFloat(`frac-z-${i}`, -vmin * 120, vmin * 20);
    const rotX = randomFloat(`frac-rx-${i}`, -180, 180);
    const rotY = randomFloat(`frac-ry-${i}`, -180, 180);
    const rotZ = randomFloat(`frac-rz-${i}`, -90, 90);

    const distFromCenter = Math.abs(row - 2) + Math.abs(col - 2);
    const staggerDelay = distFromCenter * 4;

    const x = col * (tileSize + gap);
    const y = row * (tileSize + gap);
    const symbol = row === CENTER_ROW ? SYMBOLS[col] : null;
    const color = TILE_COLORS[i % TILE_COLORS.length];

    return (
      <StaggeredMotion
        key={i}
        transition={{
          x: [dx, 0, hold(60), dx],
          y: [dy, 0, hold(60), dy],
          z: [dz, 0, hold(60), dz],
          rotateX: [rotX, 0, hold(60), rotX],
          rotateY: [rotY, 0, hold(60), rotY],
          rotateZ: [rotZ, 0, hold(60), rotZ],
          opacity: [0, 1, hold(60), 0],
          frames: [0, 170],
          duration: 170,
          delay: staggerDelay,
          easing: "easeInOutCubic",
        }}
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: tileSize,
          height: tileSize,
          perspective: `${vmin * 100}px`,
          transformStyle: "preserve-3d",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: vmin * 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            boxShadow: `0 0 0 ${vmin * 0.25}px #27272a`,
            background: `linear-gradient(135deg, ${color} 0%, #18181b 100%)`,
          }}
        >
          {symbol && (
            <span
              style={{
                fontSize: tileSize * 0.55,
                fontWeight: 900,
                color: "white",
                textShadow: `0 0 5px black`,
                lineHeight: 1,
                position: "relative",
              }}
            >
              {symbol}
            </span>
          )}
        </div>
      </StaggeredMotion>
    );
  });

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
      <StaggeredMotion
        transition={{
          frames: [0, 1],
          stagger: 0,
        }}
        style={{
          position: "relative",
          width: gridWidth,
          height: gridHeight,
          transformStyle: "preserve-3d",
        }}
      >
        {tiles}
      </StaggeredMotion>
    </div>
  );
};
