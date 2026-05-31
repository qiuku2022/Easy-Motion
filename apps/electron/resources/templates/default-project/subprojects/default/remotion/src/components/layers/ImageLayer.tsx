import React from 'react';
import { useCurrentFrame, useVideoConfig, Img, staticFile } from 'remotion';
import type { Transform, Keyframe, AnimationConfig, ImageStyle } from './utils';
import { applyKeyframes, applyAnimation } from './utils';

interface ImageLayerProps {
  clipId: string;
  source: { kind: 'asset'; path: string };
  transform: Transform;
  style?: ImageStyle;
  keyframes?: Keyframe[];
  inAnimation?: AnimationConfig;
  outAnimation?: AnimationConfig;
}

export const ImageLayer: React.FC<ImageLayerProps> = React.memo(
  ({ clipId, source, transform, style, keyframes, inAnimation, outAnimation }) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();

    // Apply keyframe interpolation for transform properties
    const posX = applyKeyframes(frame, keyframes ?? [], 'transform.position.x', transform.position.x, fps);
    const posY = applyKeyframes(frame, keyframes ?? [], 'transform.position.y', transform.position.y, fps);
    const scale = applyKeyframes(frame, keyframes ?? [], 'transform.scale', transform.scale, fps);
    const rotation = applyKeyframes(frame, keyframes ?? [], 'transform.rotation', transform.rotation, fps);
    const baseOpacity = applyKeyframes(frame, keyframes ?? [], 'transform.opacity', transform.opacity, fps);

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
          overflow: 'hidden',
        }}
      >
        <Img
          src={staticFile(source.path)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: style?.objectFit ?? 'contain',
            borderRadius: style?.borderRadius,
            filter: style?.filter,
          }}
        />
      </div>
    );
  },
);

ImageLayer.displayName = 'ImageLayer';