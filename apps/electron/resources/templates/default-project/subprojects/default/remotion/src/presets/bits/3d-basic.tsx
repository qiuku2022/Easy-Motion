/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/scene-3d/3DBasic.tsx
 */

import React from "react";
import { Scene3D, Step, useViewportRect } from "remotion-bits";

export function Bits3dBasic(_props: Record<string, unknown> = {}) {
  const rect = useViewportRect();
  const fontSize = rect.vmin * 8;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#09090b",
        color: "#f4f4f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
    <Scene3D
      perspective={1000}
      transitionDuration={50}
      stepDuration={50}
      easing="easeInOutCubic"
    >
      <Step
        id="1"
        x={0}
        y={0}
        z={0}
        transition={{ opacity: [0, 1] }}
        exitTransition={{ opacity: [1, 0] }}
      >
        <h1 style={{ fontSize, color: "#f4f4f5", margin: 0 }}>Control</h1>
      </Step>
      <Step
        id="2"
        x={0}
        y={rect.vmin * 10}
        z={rect.vmin * 200}
        transition={{ opacity: [0, 1] }}
        exitTransition={{ opacity: [1, 0] }}
      >
        <h1 style={{ fontSize, background: "white", color: "black", padding: `${rect.vmin * 1}px ${rect.vmin * 4}px`, margin: 0 }}>Camera</h1>
      </Step>
      <Step
        id="3"
        x={0}
        y={rect.vmin * 20}
        z={rect.vmin * 400}
        transition={{ opacity: [0, 1] }}
        exitTransition={{ opacity: [1, 0] }}
      >
        <h1 style={{ fontSize, color: "#f4f4f5", margin: 0 }}>Action</h1>
      </Step>
    </Scene3D>
    </div>
  );
}
