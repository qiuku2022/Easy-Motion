import { describe, it, expect } from 'vitest';
import { TemplateEngine } from '../generator/template-engine';
import type { Clip, Keyframe } from '@easymotion/shared';

describe('TemplateEngine', () => {
  const engine = new TemplateEngine();

  it('renders Root.tsx with correct Composition props', () => {
    const result = engine.renderRootTsx({
      durationInFrames: 300,
      fps: 30,
      width: 1920,
      height: 1080,
    });

    expect(result).toContain("import { Composition } from 'remotion'");
    expect(result).toContain("import { MainSequence } from './components/MainSequence'");
    expect(result).toContain('durationInFrames={300}');
    expect(result).toContain('fps={30}');
    expect(result).toContain('width={1920}');
    expect(result).toContain('height={1080}');
  });

  it('renders MainSequence.tsx with AbsoluteFill and Sequence wrappers', () => {
    const clip: Clip = {
      id: 'clip-001',
      name: 'Title',
      type: 'text',
      startInFrames: 0,
      durationInFrames: 90,
      source: { kind: 'inline', content: 'Hello World' },
      transform: { position: { x: 960, y: 540 }, scale: 1, rotation: 0, opacity: 1 },
      keyframes: [],
    };

    const result = engine.renderMainSequenceTsx({
      sequences: [
        {
          trackId: 'track-001',
          trackName: 'Text Track',
          trackOrder: 0,
          clip,
          componentName: 'TextLayer',
        },
      ],
      imports: ['TextLayer'],
    });

    expect(result).toContain("import { TextLayer } from './layers/TextLayer'");
    expect(result).toContain("import { AbsoluteFill, Sequence } from 'remotion'");
    expect(result).toContain('<AbsoluteFill>');
    expect(result).toContain('from={0}');
    expect(result).toContain('durationInFrames={90}');
    expect(result).toContain('<TextLayer');
    expect(result).toContain('clipId="clip-001"');
  });

  it('orders sequences by trackOrder ascending', () => {
    const clip1: Clip = {
      id: 'clip-1',
      name: 'Bottom',
      type: 'text',
      startInFrames: 0,
      durationInFrames: 30,
      source: { kind: 'inline', content: 'A' },
      transform: { position: { x: 0, y: 0 }, scale: 1, rotation: 0, opacity: 1 },
      keyframes: [],
    };
    const clip2: Clip = {
      id: 'clip-2',
      name: 'Top',
      type: 'image',
      startInFrames: 10,
      durationInFrames: 30,
      source: { kind: 'asset', assetId: 'a1', path: 'img.png' },
      transform: { position: { x: 0, y: 0 }, scale: 1, rotation: 0, opacity: 1 },
      keyframes: [],
    };

    const result = engine.renderMainSequenceTsx({
      sequences: [
        { trackId: 't2', trackName: 'Top', trackOrder: 1, clip: clip2, componentName: 'ImageLayer' },
        { trackId: 't1', trackName: 'Bottom', trackOrder: 0, clip: clip1, componentName: 'TextLayer' },
      ],
      imports: ['TextLayer', 'ImageLayer'],
    });

    const clip1Index = result.indexOf('clipId="clip-1"');
    const clip2Index = result.indexOf('clipId="clip-2"');
    expect(clip1Index).toBeLessThan(clip2Index);
  });

  it('renders keyframes as JSON', () => {
    const kf: Keyframe[] = [
      { id: 'kf1', property: 'transform.position.x', frame: 0, value: 0, easing: 'linear', interpolation: 'linear' },
      { id: 'kf2', property: 'transform.position.x', frame: 30, value: 100, easing: 'ease-out', interpolation: 'linear' },
    ];

    const result = engine.renderKeyframes(kf);
    expect(result).toContain('"property":"transform.position.x"');
    expect(result).toContain('"frame":0');
    expect(result).toContain('"frame":30');
  });

  it('renders empty sequences correctly', () => {
    const result = engine.renderMainSequenceTsx({
      sequences: [],
      imports: [],
    });

    expect(result).toContain('<AbsoluteFill>');
    expect(result).toContain('</AbsoluteFill>');
    expect(result).not.toContain('<Sequence');
  });
});
