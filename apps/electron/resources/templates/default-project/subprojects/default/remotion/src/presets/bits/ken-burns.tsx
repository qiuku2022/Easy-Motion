/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/scene-3d/KenBurns.tsx
 */

import React from "react";
import { AbsoluteFill } from "remotion";
import { Scene3D, Step, StaggeredMotion, useViewportRect } from "remotion-bits";

const SLIDE_COLORS = ["#1d4ed8", "#7c3aed", "#db2777"];

export function BitsKenBurns(_props: Record<string, unknown> = {}) {
  const rect = useViewportRect();
  const frameWidth = rect.vmin * 177.78;
  const frameHeight = rect.vmin * 100;
  const xShift = rect.vmin * 4.63;
  const yShift = rect.vmin * 5.56;

  const Slide = ({
    color,
    scaleFrom,
    scaleTo,
    xFrom = 0,
    xTo = 0,
    yFrom = 0,
    yTo = 0,
  }: {
    color: string;
    scaleFrom: number;
    scaleTo: number;
    xFrom?: number;
    xTo?: number;
    yFrom?: number;
    yTo?: number;
  }) => (
    <StaggeredMotion
      style={{ width: frameWidth, height: frameHeight }}
      transition={{
        scale: [scaleFrom, scaleTo],
        x: [xFrom, xTo],
        y: [yFrom, yTo],
        duration: 100,
      }}
    >
      <div
        style={{
          width: frameWidth,
          height: frameHeight,
          objectFit: "cover",
          background: `linear-gradient(135deg, ${color} 0%, #0f172a 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            color: "#fafafa",
            fontSize: frameHeight * 0.18,
            fontWeight: 800,
            letterSpacing: "0.06em",
            textShadow: "0 8px 32px rgba(0,0,0,0.55)",
          }}
        >
          Ken Burns
        </span>
      </div>
    </StaggeredMotion>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Scene3D stepDuration={60} transitionDuration={60}>
        <Step
          id="0"
          z={0}
          duration={100}
          transition={{ opacity: [0, 1] }}
          exitTransition={{ opacity: [1, 0] }}
        >
          <Slide
            color={SLIDE_COLORS[0]}
            scaleFrom={1.1}
            scaleTo={1.4}
            xTo={xShift}
          />
        </Step>

        <Step
          id="1"
          z={-10}
          duration={100}
          transition={{ opacity: [0, 1] }}
          exitTransition={{ opacity: [1, 0] }}
        >
          <Slide
            color={SLIDE_COLORS[1]}
            scaleFrom={1.3}
            scaleTo={1.1}
            xFrom={-xShift}
          />
        </Step>

        <Step
          id="2"
          z={-20}
          duration={100}
          transition={{ opacity: [0, 1] }}
          exitTransition={{ opacity: [1, 0] }}
        >
          <Slide
            color={SLIDE_COLORS[2]}
            scaleFrom={1.0}
            scaleTo={1.2}
            yFrom={yShift}
            yTo={-yShift}
          />
        </Step>
      </Scene3D>
    </AbsoluteFill>
  );
}
