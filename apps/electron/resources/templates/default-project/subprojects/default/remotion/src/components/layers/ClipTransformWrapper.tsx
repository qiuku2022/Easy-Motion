import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { applyKeyframesToClip } from "../../lib/apply-keyframes";
import { resolveFillLayoutOffset } from "../../lib/clip-motion-wrapper";

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
  children,
}: ClipTransformWrapperProps) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

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
  const offset = resolveFillLayoutOffset(resolved.transform.position, {
    width,
    height,
  });
  const scale = resolved.transform.scale ?? 1;
  const rotation = resolved.transform.rotation ?? 0;
  const transformCss = `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`;

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

export {
  resolveClipTransformLayout,
  shouldWrapClipMotion,
} from "../../lib/clip-motion-wrapper";
