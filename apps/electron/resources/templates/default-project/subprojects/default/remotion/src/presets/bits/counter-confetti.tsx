/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/animated-counter/CounterConfetti.tsx
 */

import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import {
  AnimatedCounter,
  Particles,
  Spawner,
  Behavior,
  useViewportRect,
  resolvePoint,
} from "remotion-bits";

export function BitsCounterConfetti(_props: Record<string, unknown> = {}) {
  const CONFETTI_COLORS = [
    "#FF6B6B",
    "#FFD93D",
    "#6BCB77",
    "#4D96FF",
    "#C084FC",
    "#FF8FA3",
    "#36D399",
    "#FBBD23",
  ];

  const rect = useViewportRect();
  const counterEnd = 90;
  const confettiStart = counterEnd - 5;

  const ConfettiPiece: React.FC<{ color: string; size: number }> = ({
    color,
    size,
  }) => (
    <div
      style={{
        width: size,
        height: size * 0.6,
        backgroundColor: color,
        borderRadius: size * 0.15,
      }}
    />
  );

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AnimatedCounter
        transition={{
          values: [0, 1000],
          duration: counterEnd,
          easing: "easeOutQuart",
          scale: [0.2, 1.3, 1.3, 1],
          opacity: [0, 1],
        }}
        toFixed={0}
        style={{
          fontSize: rect.vmin * 15,
          fontWeight: 900,
          fontFamily: "monospace",
          color: "currentColor",
          textShadow: `0 0 ${rect.vmin * 4}px currentColor`,
          letterSpacing: rect.vmin * 0.5,
        }}
      />

      <Sequence from={confettiStart}>
        <Particles>
          <Spawner
            rate={0}
            burst={40}
            position={resolvePoint(rect, { x: "-5%", y: "50%" })}
            area={{ width: 0, height: rect.height * 0.3 }}
            velocity={{
              x: rect.width * 0.04,
              y: -rect.height * 0.02,
              varianceX: rect.width * 0.015,
              varianceY: rect.height * 0.03,
            }}
            lifespan={120}
            max={40}
          >
            {CONFETTI_COLORS.map((color, i) => (
              <ConfettiPiece
                key={i}
                color={color}
                size={rect.vmin * 3}
              />
            ))}
          </Spawner>

          <Spawner
            rate={0}
            burst={40}
            position={resolvePoint(rect, { x: "105%", y: "50%" })}
            area={{ width: 0, height: rect.height * 0.3 }}
            velocity={{
              x: -rect.width * 0.04,
              y: -rect.height * 0.02,
              varianceX: rect.width * 0.015,
              varianceY: rect.height * 0.03,
            }}
            lifespan={120}
            max={40}
          >
            {CONFETTI_COLORS.map((color, i) => (
              <ConfettiPiece
                key={i}
                color={color}
                size={rect.vmin * 3}
              />
            ))}
          </Spawner>

          <Spawner
            rate={0}
            burst={30}
            position={resolvePoint(rect, { x: "center", y: "110%" })}
            area={{ width: rect.width * 0.6, height: 0 }}
            velocity={{
              x: 0,
              y: -rect.height * 0.06,
              varianceX: rect.width * 0.02,
              varianceY: rect.height * 0.015,
            }}
            lifespan={120}
            max={30}
          >
            {CONFETTI_COLORS.map((color, i) => (
              <ConfettiPiece
                key={i}
                color={color}
                size={rect.vmin * 3}
              />
            ))}
          </Spawner>

          <Behavior gravity={{ y: 0.3 }} />
          <Behavior
            handler={(p) => {
              p.rotation += p.velocity.x * 0.8;
            }}
          />
          <Behavior drag={0.98} />
          <Behavior opacity={[1, 0]} />
        </Particles>
      </Sequence>
    </AbsoluteFill>
  );
};
