import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { applyKeyframesToClip } from "../../lib/apply-keyframes";
import { buildCenterAnchoredLayerStyle } from "../../lib/layer-anchor-style";
import { useLayerScreenPosition } from "../../lib/use-layer-screen-position";

type Transform = {
  position: { x: number; y: number };
  scale: number;
  rotation: number;
  opacity: number;
};

type TimelineKeyframe = Parameters<typeof applyKeyframesToClip>[0]["keyframes"];

type ClipTransformWrapperProps = {
  transform?: Partial<Transform> & {
    position?: Partial<{ x: number; y: number }>;
  };
  keyframes?: TimelineKeyframe;
  inAnimation?: { type: string; durationInFrames: number };
  /** fill：全画布预设；positioned：图层中心为锚点 */
  layout?: "fill" | "positioned";
  children: React.ReactNode;
};

const DEFAULT_TRANSFORM: Transform = {
  position: { x: 960, y: 540 },
  scale: 1,
  rotation: 0,
  opacity: 1,
};

export function ClipTransformWrapper({
  transform: transformInput,
  keyframes = [],
  inAnimation,
  layout = "fill",
  children,
}: ClipTransformWrapperProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const baseTransform = useMemo(
    (): Transform => ({
      ...DEFAULT_TRANSFORM,
      ...transformInput,
      position: {
        ...DEFAULT_TRANSFORM.position,
        ...transformInput?.position,
      },
    }),
    [transformInput],
  );

  const resolved = useMemo(
    () =>
      applyKeyframesToClip(
        { transform: baseTransform, keyframes },
        frame,
        fps,
      ) as { transform: Transform },
    [baseTransform, frame, fps, keyframes],
  );

  const fadeIn =
    inAnimation?.type === "fade"
      ? interpolate(frame, [0, inAnimation.durationInFrames], [0, 1], {
          extrapolateRight: "clamp",
        })
      : 1;

  const opacity = (resolved.transform.opacity ?? 1) * fadeIn;
  const screen = useLayerScreenPosition(
    resolved.transform.position.x,
    resolved.transform.position.y,
  );

  if (layout === "positioned") {
    return (
      <div
        style={buildCenterAnchoredLayerStyle(screen, {
          scale: resolved.transform.scale ?? 1,
          rotation: resolved.transform.rotation ?? 0,
          opacity,
        })}
      >
        {children}
      </div>
    );
  }

  const transformCss = `scale(${resolved.transform.scale ?? 1}) rotate(${resolved.transform.rotation ?? 0}deg)`;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        transform: transformCss,
        opacity,
      }}
    >
      {children}
    </div>
  );
}

export function resolveClipTransformLayout(
  transform: ClipTransformWrapperProps["transform"],
  keyframes: TimelineKeyframe,
): "fill" | "positioned" {
  if (transform?.position != null) return "positioned";
  return (keyframes ?? []).some((kf) => kf.property.startsWith("transform.position"))
    ? "positioned"
    : "fill";
}
