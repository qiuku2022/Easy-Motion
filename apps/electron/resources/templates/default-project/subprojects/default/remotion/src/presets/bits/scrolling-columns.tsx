/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/particle-system/ScrollingColumns.tsx
 */

import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { Particles, Spawner, useViewportRect, Scene3D, Step } from "remotion-bits";

export function BitsScrollingColumns(_props: Record<string, unknown> = {}) {
  const rect = useViewportRect();
  const { durationInFrames } = useVideoConfig();

  const columns = [
    { x: -rect.width * 0.28, speed: 9, color: "#ef4444", z: 50 },
    { x: -rect.width * 0.1, speed: 12, color: "#3b82f6", z: 0 },
    { x: rect.width * 0.1, speed: 10, color: "#10b981", z: 100 },
    { x: rect.width * 0.28, speed: 11, color: "#f59e0b", z: -50 },
  ];

  const itemWidth = rect.width * 0.18;
  const itemHeight = itemWidth * 1.15;
  const gap = 24;

  const wrapperStyle: React.CSSProperties = {
    position: 'absolute',
    width: rect.width,
    height: rect.height,
    left: -rect.width / 2,
    top: -rect.height / 2,
  };

  const cardColors = [
    "#ef4444", "#f87171", "#fca5a5",
    "#3b82f6", "#60a5fa", "#93c5fd",
    "#10b981", "#34d399", "#6ee7b7",
    "#f59e0b", "#fbbf24", "#fcd34d",
    "#8b5cf6", "#a78bfa", "#c4b5fd",
  ];

  const ImagePlaceholder: React.FC<{
    color: string;
    width: number;
    height: number;
    text: string;
  }> = ({ color, width, height, text }) => (
    <div
      style={{
        width,
        height,
        backgroundColor: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: "bold",
        fontSize: width * 0.2,
        borderRadius: width * 0.05,
        boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
        border: "2px solid rgba(255,255,255,0.1)",
      }}
    >
      {text}
    </div>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      <Scene3D
        perspective={2000}
        transitionDuration={durationInFrames}
        stepDuration={1}
        activeStep={1}
        easing={'easeIn'}
      >
        {/* Keep content near center so preset cards aren't empty corner shots. */}
        <Step
          id="start"
          x={0}
          y={0}
          scale={0.72}
        />
        <Step
          id="end"
          x={rect.width * 0.04}
          y={-rect.height * 0.08}
          scale={0.85}
        />
        <div style={wrapperStyle}>
          <Particles>
            {columns.map((col, i) => {
              const rate = Math.max(0.08, col.speed / (itemHeight + gap));
              return (
                <Spawner
                  key={i}
                  rate={rate}
                  position={{
                    x: col.x + rect.width / 2 - itemWidth / 2,
                    y: -itemHeight,
                    z: col.z
                  }}
                  velocity={{ x: 0, y: col.speed, z: 0 }}
                  lifespan={durationInFrames + 200}
                  startFrame={0}
                >
                  {cardColors.map((color, idx) => (
                    <ImagePlaceholder
                      key={idx}
                      color={color}
                      width={itemWidth}
                      height={itemHeight}
                      text={String((idx % 9) + 1)}
                    />
                  ))}
                </Spawner>
              );
            })}
          </Particles>
        </div>
      </Scene3D>
    </AbsoluteFill>
  );
};
