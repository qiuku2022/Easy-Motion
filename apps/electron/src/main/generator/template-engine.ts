import type { Clip, Keyframe } from '@easymotion/shared';

/**
 * Parameters for rendering Root.tsx
 */
export interface RenderRootTsxParams {
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
}

/**
 * Clip entry with track metadata for sequence rendering
 */
export interface SequenceClipEntry {
  trackId: string;
  trackName: string;
  trackOrder: number;
  clip: Clip;
  componentName: string;
}

/**
 * Parameters for rendering MainSequence.tsx
 */
export interface RenderMainSequenceTsxParams {
  sequences: SequenceClipEntry[];
  imports: string[];
}

/**
 * Template Engine for generating Remotion TSX code.
 * Uses string template literals (not AST manipulation).
 */
export class TemplateEngine {
  /**
   * Render Root.tsx content with Composition component.
   */
  renderRootTsx(params: RenderRootTsxParams): string {
    const { durationInFrames, fps, width, height } = params;

    return `import { Composition } from 'remotion';
import { MainSequence } from './components/MainSequence';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Main"
      component={MainSequence}
      durationInFrames={${durationInFrames}}
      fps={${fps}}
      width={${width}}
      height={${height}}
    />
  );
};
`;
  }

  /**
   * Render MainSequence.tsx with AbsoluteFill, import statements,
   * and Sequence wrappers for each clip.
   * Higher trackOrder = top layer (rendered later in JSX so it overlays).
   */
  renderMainSequenceTsx(params: RenderMainSequenceTsxParams): string {
    const { sequences, imports } = params;

    // Sort sequences by trackOrder ascending (lower order = bottom layer)
    const sortedSequences = [...sequences].sort(
      (a, b) => a.trackOrder - b.trackOrder
    );

    const importStatements = imports
      .map((name) => `import { ${name} } from './layers/${name}';`)
      .join('\n');

    const sequenceElements = sortedSequences
      .map((seq) => {
        const layerImport = seq.componentName;
        return `      <Sequence from={${seq.clip.startInFrames}} durationInFrames={${seq.clip.durationInFrames}}>
        <${layerImport}
          clipId="${seq.clip.id}"
          source={${this.renderClipSource(seq.clip)}}
          transform={${this.renderTransform(seq.clip.transform)}}
          style={${this.renderStyle(seq.clip)}}
          keyframes={${this.renderKeyframes(seq.clip.keyframes)}}
          inAnimation={${this.renderAnimation(seq.clip.animations?.in)}}
          outAnimation={${this.renderAnimation(seq.clip.animations?.out)}}
        />
      </Sequence>`;
      })
      .join('\n\n');

    return `import React from 'react';
${importStatements}
import { AbsoluteFill, Sequence } from 'remotion';

export const MainSequence: React.FC = () => {
  return (
    <AbsoluteFill>
${sequenceElements}
    </AbsoluteFill>
  );
};
`;
  }

  /**
   * Render layer props string for a clip.
   * Returns a formatted string representation of clip properties as JSX props.
   */
  renderLayerProps(clip: Clip): string {
    const props: string[] = [];

    props.push(`clipId: "${clip.id}"`);
    props.push(`source: ${this.renderClipSource(clip)}`);
    props.push(`transform: ${this.renderTransform(clip.transform)}`);
    props.push(`style: ${this.renderStyle(clip)}`);
    props.push(`keyframes: ${this.renderKeyframes(clip.keyframes)}`);

    if (clip.animations?.in) {
      props.push(`inAnimation: ${this.renderAnimation(clip.animations.in)}`);
    }

    if (clip.animations?.out) {
      props.push(`outAnimation: ${this.renderAnimation(clip.animations.out)}`);
    }

    return props.join(', ');
  }

  /**
   * Convert Clip properties to JSX props string.
   */
  private renderClipSource(clip: Clip): string {
    return JSON.stringify(clip.source);
  }

  /**
   * Convert Transform to JSON string prop.
   */
  private renderTransform(transform: Clip['transform']): string {
    return JSON.stringify(transform);
  }

  /**
   * Render style object as JSON string.
   */
  private renderStyle(clip: Clip): string {
    if (clip.style) {
      return JSON.stringify(clip.style);
    }
    return '{}';
  }

  /**
   * Convert Keyframe array to JSON string prop.
   */
  renderKeyframes(keyframes: Keyframe[]): string {
    return JSON.stringify(keyframes);
  }

  /**
   * Render AnimationConfig as JSON string or null.
   */
  private renderAnimation(
    animation: { type: string; durationInFrames: number } | undefined
  ): string {
    if (!animation) {
      return 'null';
    }
    return JSON.stringify(animation);
  }
}