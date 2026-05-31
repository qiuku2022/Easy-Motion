import { describe, it, expect } from 'vitest';
import { TimelineGenerator } from '../generator';
import { TemplateEngine } from '../generator/template-engine';
import { ComponentRegistry } from '../generator/component-registry';
import type { Timeline, Track, Clip } from '@easymotion/shared';

describe('TimelineGenerator', () => {
  const templateEngine = new TemplateEngine();
  const registry = new ComponentRegistry();
  const generator = new TimelineGenerator(templateEngine, registry);

  function createTestClip(id: string, type: 'text' | 'image', start: number, duration: number): Clip {
    return {
      id,
      name: `${type}-${id}`,
      type,
      startInFrames: start,
      durationInFrames: duration,
      source: type === 'text'
        ? { kind: 'inline', content: `Content ${id}` }
        : { kind: 'asset', assetId: id, path: `assets/${id}.png` },
      transform: { position: { x: 960, y: 540 }, scale: 1, rotation: 0, opacity: 1 },
      keyframes: [],
    };
  }

  function createTestTrack(id: string, order: number, clips: Clip[], visible = true): Track {
    return {
      id,
      name: `Track ${id}`,
      type: clips[0]?.type ?? 'text',
      order,
      visible,
      locked: false,
      clips,
    };
  }

  it('generates Root.tsx and MainSequence.tsx for a timeline with 2 text tracks', async () => {
    const timeline: Timeline = {
      id: 'tl-001',
      version: '1.0',
      fps: 30,
      durationInFrames: 300,
      width: 1920,
      height: 1080,
      tracks: [
        createTestTrack('t1', 0, [createTestClip('c1', 'text', 0, 90)]),
        createTestTrack('t2', 1, [createTestClip('c2', 'text', 30, 120)]),
      ],
    };

    const result = await generator.generateFromTimeline(timeline, 'sp-001');

    expect(result.rootTsx).toContain('Composition');
    expect(result.rootTsx).toContain('durationInFrames={300}');
    expect(result.mainSequenceTsx).toContain('TextLayer');
    expect(result.mainSequenceTsx).toContain('from={0}');
    expect(result.mainSequenceTsx).toContain('from={30}');
    expect(result.mainSequenceTsx).toContain('durationInFrames={90}');
    expect(result.mainSequenceTsx).toContain('durationInFrames={120}');
  });

  it('skips invisible tracks', async () => {
    const timeline: Timeline = {
      id: 'tl-002',
      version: '1.0',
      fps: 30,
      durationInFrames: 300,
      width: 1920,
      height: 1080,
      tracks: [
        createTestTrack('t1', 0, [createTestClip('c1', 'text', 0, 90)], true),
        createTestTrack('t2', 1, [createTestClip('c2', 'text', 30, 120)], false),
      ],
    };

    const result = await generator.generateFromTimeline(timeline, 'sp-002');

    expect(result.mainSequenceTsx).toContain('clipId="c1"');
    expect(result.mainSequenceTsx).not.toContain('clipId="c2"');
  });

  it('flattens group tracks', async () => {
    const timeline: Timeline = {
      id: 'tl-003',
      version: '1.0',
      fps: 30,
      durationInFrames: 300,
      width: 1920,
      height: 1080,
      tracks: [
        {
          id: 'group-1',
          name: 'Group',
          type: 'group',
          order: 0,
          visible: true,
          locked: false,
          clips: [],
          children: [
            createTestTrack('t1', 0, [createTestClip('c1', 'text', 0, 60)]),
          ],
        },
      ],
    };

    const result = await generator.generateFromTimeline(timeline, 'sp-003');
    expect(result.mainSequenceTsx).toContain('clipId="c1"');
  });

  it('sorts tracks by order ascending', async () => {
    const clip1 = createTestClip('c1', 'text', 0, 60);
    const clip2 = createTestClip('c2', 'image', 0, 60);

    const timeline: Timeline = {
      id: 'tl-004',
      version: '1.0',
      fps: 30,
      durationInFrames: 300,
      width: 1920,
      height: 1080,
      tracks: [
        createTestTrack('t2', 1, [clip2]),
        createTestTrack('t1', 0, [clip1]),
      ],
    };

    const result = await generator.generateFromTimeline(timeline, 'sp-004');

    const textIndex = result.mainSequenceTsx.indexOf('TextLayer');
    const imageIndex = result.mainSequenceTsx.indexOf('ImageLayer');
    expect(textIndex).toBeLessThan(imageIndex);
  });
});
