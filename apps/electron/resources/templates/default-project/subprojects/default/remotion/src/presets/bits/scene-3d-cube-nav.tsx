/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/scene-3d/CubeNavigation.tsx
 */

import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import { Scene3D, Step, Element3D, useViewportRect } from "remotion-bits";

export function BitsScene3dCubeNav(_props: Record<string, unknown> = {}) {
  const { vmin } = useViewportRect();
  const size = vmin * 48;
  const distance = size * 0.8;

  const FaceContent: React.FC<{
    color: string;
    title: string;
    size: number;
  }> = ({ color, title, size }) => (
    <div
      style={{
        width: size,
        height: size,
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: `${size * 0.02}px solid rgba(255,255,255,0.25)`,
        boxShadow: "0 0 40px rgba(0,0,0,0.35) inset",
      }}
    >
      <h1
        style={{
          fontSize: size * 0.15,
          margin: 0,
          color: "#fafafa",
          fontWeight: 700,
          letterSpacing: "0.04em",
          textShadow: "0 2px 12px rgba(0,0,0,0.45)",
        }}
      >
        {title}
      </h1>
    </div>
  );

  const faces = useMemo(
    () => [
      {
        id: "front",
        color: "#6366f1",
        title: "TEXT",
        rot: [0, 0, 0],
        pos: [0, 0, size / 2],
      },
      {
        id: "right",
        color: "#0ea5e9",
        title: "MOTION",
        rot: [0, 90, 90],
        pos: [size / 2, 0, 0],
      },
      {
        id: "back",
        color: "#a855f7",
        title: "PARTICLES",
        rot: [0, 180, 180],
        pos: [0, 0, -size / 2],
      },
      {
        id: "left",
        color: "#14b8a6",
        title: "GRADIENTS",
        rot: [0, -90, -90],
        pos: [-size / 2, 0, 0],
      },
      {
        id: "top",
        color: "#f59e0b",
        title: "3D",
        rot: [90, 0, 0],
        pos: [0, -size / 2, 0],
      },
      {
        id: "bottom",
        color: "#f43f5e",
        title: "BITS",
        rot: [-90, 0, 0],
        pos: [0, size / 2, 0],
      },
    ],
    [size],
  );

  const isoDist = size * 1.5;

  const isoStep = useMemo(() => {
    const offset = isoDist / Math.sqrt(3);
    return {
      x: offset,
      y: -offset,
      z: offset,
      rotateX: 35.264,
      rotateY: 45,
      rotateZ: 0,
      rotateOrder: "yxz" as const,
    };
  }, [isoDist]);

  const getCameraStep = (face: (typeof faces)[0]) => {
    let x = face.pos[0];
    let y = face.pos[1];
    let z = face.pos[2];

    const [rx, ry, rz] = face.rot;

    if (Math.abs(rx) === 90) {
      y += (rx > 0 ? -1 : 1) * distance;
    } else if (Math.abs(ry) === 90) {
      x += (ry > 0 ? 1 : -1) * distance;
    } else if (Math.abs(ry) === 180) {
      z -= distance;
    } else {
      z += distance;
    }

    return {
      id: `step-${face.id}`,
      x,
      y,
      z,
      rotateX: rx,
      rotateY: ry,
      rotateZ: rz,
    };
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#09090b" }}>
      <Scene3D
        perspective={2000}
        transitionDuration={40}
        stepDuration={60}
        easing="easeInOutCubic"
        style={{ background: "#09090b" }}
      >
        {faces.map((face) => (
          <Element3D
            key={face.id}
            centered
            x={face.pos[0]}
            y={face.pos[1]}
            z={face.pos[2]}
            rotateX={face.rot[0]}
            rotateY={face.rot[1]}
            rotateZ={face.rot[2]}
          >
            <FaceContent color={face.color} title={face.title} size={size} />
          </Element3D>
        ))}
        <Step id="start" transition={{ opacity: [0, 1] }} {...isoStep} />
        {faces.map((face) => {
          const cam = getCameraStep(face);
          return (
            <Step
              key={`s-${face.id}`}
              id={cam.id}
              x={cam.x}
              y={cam.y}
              z={cam.z}
              rotateX={cam.rotateX}
              rotateY={cam.rotateY}
              rotateZ={cam.rotateZ}
            />
          );
        })}
        <Step id="end" {...isoStep} />
      </Scene3D>
    </AbsoluteFill>
  );
}
