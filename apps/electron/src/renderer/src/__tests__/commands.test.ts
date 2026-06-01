import { describe, it, expect } from 'vitest';
import type { Timeline, Clip, Track, Keyframe } from '@easymotion/shared';
import type { WritableDraft } from 'immer';
import { MoveClipCommand } from '../stores/commands/MoveClipCommand';
import { ResizeClipCommand } from '../stores/commands/ResizeClipCommand';
import { ReorderTracksCommand } from '../stores/commands/ReorderTracksCommand';
import { AddTrackCommand } from '../stores/commands/AddTrackCommand';
import { RemoveTrackCommand } from '../stores/commands/RemoveTrackCommand';
import { AddClipCommand } from '../stores/commands/AddClipCommand';
import { RemoveClipCommand } from '../stores/commands/RemoveClipCommand';
import { ToggleTrackVisibilityCommand } from '../stores/commands/ToggleTrackVisibilityCommand';
import { ToggleTrackLockCommand } from '../stores/commands/ToggleTrackLockCommand';
import { UpdateKeyframeCommand } from '../stores/commands/UpdateKeyframeCommand';

function createTestTimeline(): Timeline {
  return {
    id: 'tl-test',
    version: '1.0',
    fps: 30,
    durationInFrames: 300,
    width: 1920,
    height: 1080,
    tracks: [
      {
        id: 'track-001',
        name: 'Text Track',
        type: 'text',
        order: 0,
        visible: true,
        locked: false,
        clips: [
          {
            id: 'clip-001',
            name: 'Title',
            type: 'text',
            startInFrames: 0,
            durationInFrames: 90,
            source: { kind: 'inline', content: 'Hello' },
            transform: { position: { x: 960, y: 540 }, scale: 1, rotation: 0, opacity: 1 },
            keyframes: [
              {
                id: 'kf-001',
                property: 'opacity',
                frame: 0,
                value: 0,
                easing: 'linear',
                interpolation: 'linear',
              },
            ],
          },
        ],
      },
      {
        id: 'track-002',
        name: 'Image Track',
        type: 'image',
        order: 1,
        visible: true,
        locked: false,
        clips: [],
      },
    ],
  };
}

describe('MoveClipCommand', () => {
  it('roundtrips execute→undo→execute', () => {
    const timeline = createTestTimeline();
    const cmd = new MoveClipCommand('clip-001', 'track-001', 'track-002', 0, 50);

    cmd.execute(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks[0].clips).toHaveLength(0);
    expect(timeline.tracks[1].clips).toHaveLength(1);
    expect(timeline.tracks[1].clips[0].startInFrames).toBe(50);

    cmd.undo(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks[0].clips).toHaveLength(1);
    expect(timeline.tracks[1].clips).toHaveLength(0);
    expect(timeline.tracks[0].clips[0].startInFrames).toBe(0);

    cmd.execute(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks[0].clips).toHaveLength(0);
    expect(timeline.tracks[1].clips).toHaveLength(1);
    expect(timeline.tracks[1].clips[0].startInFrames).toBe(50);
  });
});

describe('ResizeClipCommand', () => {
  it('roundtrips execute→undo→execute', () => {
    const timeline = createTestTimeline();
    const cmd = new ResizeClipCommand('clip-001', 0, 10, 90, 120);

    cmd.execute(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks[0].clips[0].startInFrames).toBe(10);
    expect(timeline.tracks[0].clips[0].durationInFrames).toBe(120);

    cmd.undo(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks[0].clips[0].startInFrames).toBe(0);
    expect(timeline.tracks[0].clips[0].durationInFrames).toBe(90);

    cmd.execute(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks[0].clips[0].startInFrames).toBe(10);
    expect(timeline.tracks[0].clips[0].durationInFrames).toBe(120);
  });
});

describe('ReorderTracksCommand', () => {
  it('roundtrips execute→undo→execute', () => {
    const timeline = createTestTimeline();
    const oldOrder = timeline.tracks.map((t: Track) => t.id);
    const newOrder = ['track-002', 'track-001'];
    const cmd = new ReorderTracksCommand(oldOrder, newOrder);

    cmd.execute(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks[0].id).toBe('track-002');
    expect(timeline.tracks[1].id).toBe('track-001');
    expect(timeline.tracks[0].order).toBe(0);
    expect(timeline.tracks[1].order).toBe(1);

    cmd.undo(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks[0].id).toBe('track-001');
    expect(timeline.tracks[1].id).toBe('track-002');
    expect(timeline.tracks[0].order).toBe(0);
    expect(timeline.tracks[1].order).toBe(1);

    cmd.execute(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks[0].id).toBe('track-002');
    expect(timeline.tracks[1].id).toBe('track-001');
  });
});

describe('AddTrackCommand', () => {
  it('roundtrips execute→undo→execute', () => {
    const timeline = createTestTimeline();
    const newTrack: Track = {
      id: 'track-003',
      name: 'Audio Track',
      type: 'audio',
      order: 2,
      visible: true,
      locked: false,
      clips: [],
    };
    const cmd = new AddTrackCommand('track-003', newTrack);

    cmd.execute(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks).toHaveLength(3);
    expect(timeline.tracks[2].id).toBe('track-003');

    cmd.undo(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks).toHaveLength(2);
    expect(timeline.tracks.find((t: Track) => t.id === 'track-003')).toBeUndefined();

    cmd.execute(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks).toHaveLength(3);
    expect(timeline.tracks[2].id).toBe('track-003');
  });
});

describe('RemoveTrackCommand', () => {
  it('roundtrips execute→undo→execute', () => {
    const timeline = createTestTimeline();
    const trackData = JSON.parse(JSON.stringify(timeline.tracks[1])) as Track;
    const cmd = new RemoveTrackCommand('track-002', trackData);

    cmd.execute(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks).toHaveLength(1);
    expect(timeline.tracks.find((t: Track) => t.id === 'track-002')).toBeUndefined();

    cmd.undo(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks).toHaveLength(2);
    expect(timeline.tracks[1].id).toBe('track-002');

    cmd.execute(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks).toHaveLength(1);
  });
});

describe('AddClipCommand', () => {
  it('roundtrips execute→undo→execute', () => {
    const timeline = createTestTimeline();
    const newClip: Clip = {
      id: 'clip-002',
      name: 'Subtitle',
      type: 'text',
      startInFrames: 30,
      durationInFrames: 60,
      source: { kind: 'inline', content: 'World' },
      transform: { position: { x: 960, y: 600 }, scale: 1, rotation: 0, opacity: 1 },
      keyframes: [],
    };
    const cmd = new AddClipCommand('track-001', newClip);

    cmd.execute(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks[0].clips).toHaveLength(2);
    expect(timeline.tracks[0].clips[1].id).toBe('clip-002');

    cmd.undo(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks[0].clips).toHaveLength(1);
    expect(timeline.tracks[0].clips.find((c: Clip) => c.id === 'clip-002')).toBeUndefined();

    cmd.execute(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks[0].clips).toHaveLength(2);
    expect(timeline.tracks[0].clips[1].id).toBe('clip-002');
  });
});

describe('RemoveClipCommand', () => {
  it('roundtrips execute→undo→execute', () => {
    const timeline = createTestTimeline();
    const clipData = JSON.parse(JSON.stringify(timeline.tracks[0].clips[0])) as Clip;
    const cmd = new RemoveClipCommand('track-001', clipData);

    cmd.execute(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks[0].clips).toHaveLength(0);

    cmd.undo(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks[0].clips).toHaveLength(1);
    expect(timeline.tracks[0].clips[0].id).toBe('clip-001');

    cmd.execute(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks[0].clips).toHaveLength(0);
  });
});

describe('ToggleTrackVisibilityCommand', () => {
  it('roundtrips execute→undo→execute', () => {
    const timeline = createTestTimeline();
    const cmd = new ToggleTrackVisibilityCommand('track-001', true, false);

    cmd.execute(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks[0].visible).toBe(false);

    cmd.undo(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks[0].visible).toBe(true);

    cmd.execute(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks[0].visible).toBe(false);
  });
});

describe('ToggleTrackLockCommand', () => {
  it('roundtrips execute→undo→execute', () => {
    const timeline = createTestTimeline();
    const cmd = new ToggleTrackLockCommand('track-001', false, true);

    cmd.execute(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks[0].locked).toBe(true);

    cmd.undo(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks[0].locked).toBe(false);

    cmd.execute(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks[0].locked).toBe(true);
  });
});

describe('UpdateKeyframeCommand', () => {
  it('roundtrips execute→undo→execute', () => {
    const timeline = createTestTimeline();
    const oldKeyframe: Keyframe = JSON.parse(
      JSON.stringify(timeline.tracks[0].clips[0].keyframes[0])
    ) as Keyframe;
    const newKeyframe: Keyframe = { ...oldKeyframe, value: 1, frame: 30 };
    const cmd = new UpdateKeyframeCommand('clip-001', 'kf-001', oldKeyframe, newKeyframe);

    cmd.execute(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks[0].clips[0].keyframes[0].value).toBe(1);
    expect(timeline.tracks[0].clips[0].keyframes[0].frame).toBe(30);

    cmd.undo(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks[0].clips[0].keyframes[0].value).toBe(0);
    expect(timeline.tracks[0].clips[0].keyframes[0].frame).toBe(0);

    cmd.execute(timeline as WritableDraft<Timeline>);
    expect(timeline.tracks[0].clips[0].keyframes[0].value).toBe(1);
    expect(timeline.tracks[0].clips[0].keyframes[0].frame).toBe(30);
  });
});
