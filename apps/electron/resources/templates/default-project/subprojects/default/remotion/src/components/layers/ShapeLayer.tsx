import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { Transform, Keyframe, AnimationConfig, ShapeStyle } from './utils';
import { applyKeyframes, applyAnimation } from './utils';

interface ShapeLayerProps {
  clipId: string;
  source: { kind: 'inline'; content: string };
  transform: Transform;
  style?: ShapeStyle;
  keyframes?: Keyframe[];
  inAnimation?: AnimationConfig;
  outAnimation?: AnimationConfig;
}

export const ShapeLayer: React.FC<ShapeLayerProps> = React.memo(
  ({ clipId, transform, style, keyframes, inAnimation, outAnimation }) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();

    // Apply keyframe interpolation for transform properties
    const posX = applyKeyframes(frame, keyframes ?? [], 'transform.position.x', transform.position.x, fps);
    const posY = applyKeyframes(frame, keyframes ?? [], 'transform.position.y', transform.position.y, fps);
    const scale = applyKeyframes(frame, keyframes ?? [], 'transform.scale', transform.scale, fps);
    const rotation = applyKeyframes(frame, keyframes ?? [], 'transform.rotation', transform.rotation, fps);
    const baseOpacity = applyKeyframes(frame, keyframes ?? [], 'transform.opacity', transform.opacity, fps);

    // Apply keyframe interpolation for shape dimensions
    const width = applyKeyframes(frame, keyframes ?? [], 'style.width', style?.width ?? 200, fps);
    const height = applyKeyframes(frame, keyframes ?? [], 'style.height', style?.height ?? 200, fps);

    // Apply in/out animations
    const inMods = applyAnimation(frame, durationInFrames, inAnimation, 'in');
    const outMods = applyAnimation(frame, durationInFrames, outAnimation, 'out');

    const finalOpacity = baseOpacity * inMods.opacityMultiplier * outMods.opacityMultiplier;
    const finalTranslateX = inMods.translateX + outMods.translateX;
    const finalTranslateY = inMods.translateY + outMods.translateY;

    const transformStr = `translate(${posX + finalTranslateX}px, ${posY + finalTranslateY}px) rotate(${rotation}deg) scale(${scale})`;

    const isCircle = style?.shapeType === 'circle';

    return (
      <div
        id={clipId}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: transformStr,
          opacity: finalOpacity,
          width,
          height,
          backgroundColor: style?.fillColor ?? '#3498db',
          borderColor: style?.strokeColor,
          borderWidth: style?.strokeWidth ?? 0,
          borderStyle: 'solid',
          borderRadius: isCircle ? '50%' : 0,
        }}
      />
    );
  },
);

ShapeLayer.displayName = 'ShapeLayer';