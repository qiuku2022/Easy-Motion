/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/scene-3d/StepTimingContext.tsx
 */

import React from "react";
import { AbsoluteFill } from "remotion";
import { Scene3D, Step, useViewportRect, AnimatedText, StaggeredMotion } from "remotion-bits";

export function Bits3dStepTimingContext(_props: Record<string, unknown> = {}) {
  const rect = useViewportRect();
  const fontSize = rect.vmin * 6;

  return (
    <AbsoluteFill style={{ backgroundColor: "#09090b", color: "#f4f4f5" }}>
      <Scene3D
        perspective={1000}
        transitionDuration={40}
        stepDuration={100}
        easing="easeInOutCubic"
      >
        <Step
          id="1"
          x={0}
          y={-rect.vmin * 20}
          z={0}
          transition={{ opacity: [0, 1], y: [50, 0] }}
          exitTransition={{ opacity: [1, 0], y: [0, -50] }}
        >
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: fontSize * 0.6, marginBottom: "20px", color: "#a1a1aa" }}>
              Auto-Aligned Timing
            </h2>
            <AnimatedText
              transition={{
                opacity: [0, 1],
                y: [20, 0],
                duration: 30,
              }}
            >
              <h1 style={{ fontSize, color: "#f4f4f5", margin: 0 }}>Step 1</h1>
            </AnimatedText>
          </div>
        </Step>

        <Step
          id="2"
          x={0}
          y={rect.vmin * 10}
          z={rect.vmin * 300}
          transition={{ opacity: [0, 1] }}
          exitTransition={{ opacity: [1, 0] }}
        >
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: fontSize * 0.6, marginBottom: "20px", color: "#a1a1aa" }}>
              Mixed Timing
            </h2>
            <div style={{ marginBottom: "40px" }}>
              <p style={{ fontSize: fontSize * 0.5, color: "#d4d4d8", marginBottom: "10px" }}>
                Auto-aligned (uses Step frames):
              </p>
              <AnimatedText
                transition={{
                  opacity: [0, 1],
                  scale: [0.8, 1],
                  duration: 25,
                }}
              >
                <h1 style={{ fontSize, color: "#f4f4f5", margin: 0 }}>Auto</h1>
              </AnimatedText>
            </div>
            <div>
              <p style={{ fontSize: fontSize * 0.5, color: "#d4d4d8", marginBottom: "10px" }}>
                Explicit frames (overrides Step):
              </p>
              <AnimatedText
                transition={{
                  opacity: [0, 1],
                  scale: [0.8, 1],
                  frames: [140, 180],
                }}
              >
                <h1 style={{ fontSize, color: "#f4f4f5", margin: 0 }}>Explicit</h1>
              </AnimatedText>
            </div>
          </div>
        </Step>

        <Step
          id="3"
          x={0}
          y={rect.vmin * 30}
          z={rect.vmin * 600}
          transition={{ opacity: [0, 1] }}
          exitTransition={{ opacity: [1, 0] }}
        >
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: fontSize * 0.6, marginBottom: "40px", color: "#a1a1aa" }}>
              Staggered Within Step
            </h2>
            <StaggeredMotion
              transition={{
                opacity: [0, 1],
                y: [30, 0],
                duration: 20,
                stagger: 8,
              }}
            >
              <h1 style={{ fontSize, marginBottom: "10px", color: "#f4f4f5" }}>Letter</h1>
              <h1 style={{ fontSize, marginBottom: "10px", color: "#f4f4f5" }}>By</h1>
              <h1 style={{ fontSize, color: "#f4f4f5" }}>Letter</h1>
            </StaggeredMotion>
          </div>
        </Step>

        <Step
          id="4"
          x={0}
          y={rect.vmin * 50}
          z={rect.vmin * 900}
          transition={{ opacity: [0, 1], scale: [0.9, 1] }}
          exitTransition={{ opacity: [1, 0], scale: [1, 0.9] }}
        >
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: fontSize * 0.6, marginBottom: "20px", color: "#a1a1aa" }}>
              Summary
            </h2>
            <AnimatedText
              transition={{
                opacity: [0, 1],
                y: [20, 0],
                duration: 25,
              }}
            >
              <h1 style={{ fontSize: fontSize * 1.2, color: "#4ADE80", margin: 0 }}>
                useMotionTiming
              </h1>
            </AnimatedText>
            <AnimatedText
              transition={{
                opacity: [0, 1],
                y: [20, 0],
                delay: 10,
                duration: 25,
              }}
            >
              <h1 style={{ fontSize: fontSize * 1.2, color: "#4ADE80", margin: 0 }}>
                is Step-Aware!
              </h1>
            </AnimatedText>
          </div>
        </Step>
      </Scene3D>
    </AbsoluteFill>
  );
}
