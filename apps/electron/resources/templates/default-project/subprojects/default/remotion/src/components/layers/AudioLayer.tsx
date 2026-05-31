import React from 'react';
import { useCurrentFrame, useVideoConfig, Audio, staticFile } from 'remotion';
import type { Transform, Keyframe, AnimationConfig } from './utils';
import { applyKeyframes, applyAnimation } from './utils';

interface AudioLayerProps {
  clipId: string;
  source: { kind: 'asset'; path: string };
  transform: Transform;
  keyframes?: Keyframe[];
  inAnimation?: AnimationConfig;
  outAnimation?: AnimationConfig;
}

export const AudioLayer: React.FC<AudioLayerProps> = React.memo(
  ({ clipId, source, transform, keyframes, inAnimation, outAnimation }) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();

    // Apply keyframe interpolation for opacity (audio has no visual output,
    // but we still process keyframes for potential volume control)
    const baseOpacity = applyKeyframes(frame, keyframes ?? [], 'transform.opacity', transform.opacity, fps);

    // Apply in/out animations (processed for consistency, though audio
    // has no visual output — these could be used for volume fading)
    const inMods = applyAnimation(frame, durationInFrames, inAnimation, 'in');
    const outMods = applyAnimation(frame, durationInFrames, outAnimation, 'out');

    // Compute final opacity (used as a proxy for volume if needed)
    const _finalOpacity = baseOpacity * inMods.opacityMultiplier * outMods.opacityMultiplier;

    // AudioLayer has no visual output — render a hidden div with the Audio component
    return (
      <div id={clipId} style={{ display: 'none' }}>
        <Audio src={staticFile(source.path)} />
      </div>
    );
  },
);

AudioLayer.displayName = 'AudioLayer';