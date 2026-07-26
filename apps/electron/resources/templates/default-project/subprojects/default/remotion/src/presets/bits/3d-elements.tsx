/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/scene-3d/3DElements.tsx
 */

import React from "react";
import {
  Scene3D,
  Step,
  Element3D,
  StepResponsive,
  useViewportRect,
  StaggeredMotion,
  randomFloat,
  anyElement,
} from "remotion-bits";
import { AbsoluteFill } from "remotion";

export function Bits3dElements(_props: Record<string, unknown> = {}) {
  const rect = useViewportRect();
  const fontSize = rect.vmin * 8;
  const words = ["Fly", "Your", "Camera", "Through", "Space"];

  const els = React.useMemo(() => {
    const sizes = [16, 32];
    const cellSize = rect.vmin * 2;

    return Array(20)
      .fill(0)
      .map((_, i) => {
        const x =
          Math.round(
            randomFloat(`element3d-x-${i}`, -50 * rect.vw, 200 * rect.vw) /
            cellSize,
          ) * cellSize;
        const y =
          Math.round(
            randomFloat(`element3d-y-${i}`, -100 * rect.vh, 20 * rect.vh) /
            cellSize,
          ) * cellSize;
        const z =
          Math.round(
            randomFloat(`element3d-z-${i}`, -200 * rect.vmin, 20 * rect.vmin) /
            cellSize,
          ) * cellSize;
        const size = () =>
          anyElement(`el3d-size-${i}-${probes++}`, sizes) * rect.vmin;
        let probes = 0;

        return (
          <Element3D key={i} x={x} y={y} z={z} rotateZ={0.0001}>
            <StaggeredMotion
              transition={{
                opacity: [0, 0.85],
              }}
            >
              {(() => {
                const shapes = ["circle", "triangle", "diamond"];
                const shape = anyElement(`el3d-shape-${i}-${probes++}`, shapes);
                const color = `hsl(${randomFloat(`el3d-color-${i}-${probes++}`, 0, 360)}, 80%, 60%)`;
                const dimension = size() * 1.25;

                if (shape === "triangle") {
                  return (
                    <div
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: `${dimension / 2}px solid transparent`,
                        borderRight: `${dimension / 2}px solid transparent`,
                        borderBottom: `${dimension}px solid ${color}`,
                      }}
                    />
                  );
                }

                if (shape === "diamond") {
                  return (
                    <div
                      style={{
                        background: color,
                        width: dimension,
                        height: dimension,
                        transform: "rotate(45deg)",
                      }}
                    />
                  );
                }

                return (
                  <div
                    style={{
                      background: color,
                      width: dimension,
                      height: dimension,
                      borderRadius: "50%",
                    }}
                  />
                );
              })()}
            </StaggeredMotion>
          </Element3D>
        );
      });
  }, [rect.width, rect.height]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#09090b", color: "#f4f4f5" }}>
    <Scene3D
      perspective={rect.width > 500 ? 1000 : 500}
      transitionDuration={20}
      stepDuration={20}
      easing="easeInOut"
    >
      {els}

      {words.map((word, i) => {
        return (
          <Step
            id={`step-${i}`}
            key={i}
            x={i * rect.vmin * 50}
            y={0}
            z={0}
            rotateZ={-i * 30}
            style={{
              width: "250px",
            }}
            exitTransition={{
              opacity: [1, 0],
              duration: 15,
            }}
          >
            <StaggeredMotion
              transition={{
                y: [rect.vmin * 15, 0],
                opacity: [0, 1],
                easing: 'easeOutCubic',
                duration: 15,
              }}
              style={{ fontSize: rect.vmin * 10 }}
            >
              <h1 style={{ fontSize, color: "#f4f4f5", textAlign: "center", margin: 0 }}>
                {word}
              </h1>
            </StaggeredMotion>
          </Step>
        );
      })}
    </Scene3D>
    </AbsoluteFill>
  );
};
