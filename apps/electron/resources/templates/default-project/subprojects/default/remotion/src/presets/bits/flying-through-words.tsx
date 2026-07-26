/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/scene-3d/FlyingThroughWords.tsx
 */

import React from "react";
import { AbsoluteFill } from "remotion";
import {
  Particles,
  Spawner,
  Behavior,
  useViewportRect,
  resolvePoint,
  StaggeredMotion,
} from "remotion-bits";

const WORD_COLORS = [
  "#fafafa",
  "#e9d5ff",
  "#7dd3fc",
  "#6ee7b7",
  "#fde68a",
  "#fda4af",
];

export function BitsFlyingThroughWords(_props: Record<string, unknown> = {}) {
  const rect = useViewportRect();
  const WORDS = [
    "GPT",
    "Claude",
    "PaLM",
    "Gemini",
    "LLaMA",
    "Mistral",
    "Mixtral",
    "Falcon",
    "BLOOM",
    "Kimi",
    "MiniMax",
    "Qwen",
  ];
  const isSmall = rect.width < 500;

  return (
    <AbsoluteFill style={{ backgroundColor: "#09090b" }}>
      <Particles style={{ perspective: isSmall ? 1000 : 5000 }}>
        <Spawner
          rate={0.35}
          area={{ width: rect.width * 0.7, height: rect.height * 0.55, depth: -rect.vmin * 30 }}
          position={resolvePoint(rect, { x: "center", y: "center" })}
          lifespan={100}
          velocity={{
            x: 0,
            y: 0,
            z: rect.vmin * 10,
            varianceZ: rect.vmin * 8,
          }}
        >
          {WORDS.map((word, i) => (
            <StaggeredMotion
              key={i}
              style={{
                fontSize: rect.vmin * 12,
                textAlign: "center",
                color: WORD_COLORS[i % WORD_COLORS.length],
                fontWeight: 800,
                textShadow: "0 0 28px rgba(255,255,255,0.25)",
              }}
              transition={{
                opacity: [0.35, 1, 1, 0.85, 0.4],
              }}
            >
              {word}
            </StaggeredMotion>
          ))}
        </Spawner>

        <Behavior />
      </Particles>
    </AbsoluteFill>
  );
}
