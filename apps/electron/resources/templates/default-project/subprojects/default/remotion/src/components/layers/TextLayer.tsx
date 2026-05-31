import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { Transform, Keyframe, AnimationConfig, TextStyle } from './utils';
import { applyKeyframes, applyAnimation } from './utils';

interface TextLayerProps {
  clipId: string;
  source: { kind: 'inline'; content: string };
  transform: Transform;
  style?: TextStyle;
  keyframes?: Keyframe[];
  inAnimation?: AnimationConfig;
  outAnimation?: AnimationConfig;
}

export const TextLayer: React.FC<TextLayerProps> = React.memo(
  ({ clipId, source, transform, style, keyframes, inAnimation, outAnimation }) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();

    // Apply keyframe interpolation for transform properties
    const posX = applyKeyframes(frame, keyframes ?? [], 'transform.position.x', transform.position.x, fps);
    const posY = applyKeyframes(frame, keyframes ?? [], 'transform.position.y', transform.position.y, fps);
    const scale = applyKeyframes(frame, keyframes ?? [], 'transform.scale', transform.scale, fps);
    const rotation = applyKeyframes(frame, keyframes ?? [], 'transform.rotation', transform.rotation, fps);
    const baseOpacity = applyKeyframes(frame, keyframes ?? [], 'transform.opacity', transform.opacity, fps);

    // Apply keyframe interpolation for style properties
    const fontSize = applyKeyframes(frame, keyframes ?? [], 'style.fontSize', style?.fontSize ?? 48, fps);
    const letterSpacing = applyKeyframes(frame, keyframes ?? [], 'style.letterSpacing', style?.letterSpacing ?? 0, fps);
    const lineHeight = applyKeyframes(frame, keyframes ?? [], 'style.lineHeight', style?.lineHeight ?? 1.2, fps);

    // Apply in/out animations
    const inMods = applyAnimation(frame, durationInFrames, inAnimation, 'in');
    const outMods = applyAnimation(frame, durationInFrames, outAnimation, 'out');

    const finalOpacity = baseOpacity * inMods.opacityMultiplier * outMods.opacityMultiplier;
    const finalTranslateX = inMods.translateX + outMods.translateX;
    const finalTranslateY = inMods.translateY + outMods.translateY;

    const transformStr = `translate(${posX + finalTranslateX}px, ${posY + finalTranslateY}px) rotate(${rotation}deg) scale(${scale})`;

    return (
      <div
        id={clipId}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: transformStr,
          opacity: finalOpacity,
          fontFamily: style?.fontFamily ?? 'sans-serif',
          fontSize,
          color: style?.color ?? '#ffffff',
          textAlign: style?.textAlign ?? 'center',
          lineHeight,
          letterSpacing,
          fontWeight: style?.fontWeight,
          textShadow: style?.textShadow,
          whiteSpace: 'pre-wrap',
        }}
      >
        {source.content}
      </div>
    );
  },
);

TextLayer.displayName = 'TextLayer';