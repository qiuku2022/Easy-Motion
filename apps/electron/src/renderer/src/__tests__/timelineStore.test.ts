import { describe, it, expect, beforeEach } from 'vitest';
import { useTimelineStore } from '../stores/timelineStore';
import type { Timeline, Clip } from '@easymotion/shared';

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
            keyframes: [],
          },
        ],
      },
    ],
  };
}

describe('timelineStore', () => {
  beforeEach(() => {
    useTimelineStore.getState().clearHistory();
    useTimelineStore.getState().loadTimeline(createTestTimeline());
  });

  it('loads timeline and resets state', () => {
    const state = useTimelineStore.getState();
    expect(state.timeline).not.toBeNull();
    expect(state.timeline?.tracks).toHaveLength(1);
    expect(state.currentFrame).toBe(0);
    expect(state.hasUnsavedChanges).toBe(false);
    expect(state.canUndo()).toBe(false);
  });

  it('adds a track and enables undo', () => {
    const trackId = useTimelineStore.getState().addTrack('image', 'New Image Track');
    const state = useTimelineStore.getState();

    expect(state.timeline?.tracks).toHaveLength(2);
    expect(state.canUndo()).toBe(true);
    expect(state.hasUnsavedChanges).toBe(true);

    const newTrack = state.timeline?.tracks.find((t) => t.id === trackId);
    expect(newTrack?.type).toBe('image');
    expect(newTrack?.name).toBe('New Image Track');
    expect(newTrack?.order).toBe(1);
  });

  it('undoes addTrack and restores previous state', () => {
    useTimelineStore.getState().addTrack('image', 'Track to Undo');
    expect(useTimelineStore.getState().timeline?.tracks).toHaveLength(2);

    useTimelineStore.getState().undo();
    const state = useTimelineStore.getState();
    expect(state.timeline?.tracks).toHaveLength(1);
    expect(state.canRedo()).toBe(true);
  });

  it('redoes after undo', () => {
    useTimelineStore.getState().addTrack('image', 'Track to Redo');
    useTimelineStore.getState().undo();
    expect(useTimelineStore.getState().timeline?.tracks).toHaveLength(1);

    useTimelineStore.getState().redo();
    const state = useTimelineStore.getState();
    expect(state.timeline?.tracks).toHaveLength(2);
    expect(state.canRedo()).toBe(false);
  });

  it('adds a clip to a track', () => {
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

    useTimelineStore.getState().addClip('track-001', newClip);
    const state = useTimelineStore.getState();
    const track = state.timeline?.tracks.find((t) => t.id === 'track-001');
    expect(track?.clips).toHaveLength(2);
    expect(state.hasUnsavedChanges).toBe(true);
  });

  it('removes a clip', () => {
    useTimelineStore.getState().removeClip('track-001', 'clip-001');
    const state = useTimelineStore.getState();
    const track = state.timeline?.tracks.find((t) => t.id === 'track-001');
    expect(track?.clips).toHaveLength(0);
  });

  it('moves a clip to another track', () => {
    useTimelineStore.getState().addTrack('image', 'Target Track');
    const tracks = useTimelineStore.getState().timeline?.tracks ?? [];
    const targetTrackId = tracks.find((t) => t.name === 'Target Track')?.id ?? '';

    useTimelineStore.getState().moveClip('clip-001', targetTrackId, 10);
    const state = useTimelineStore.getState();
    const sourceTrack = state.timeline?.tracks.find((t) => t.id === 'track-001');
    const targetTrack = state.timeline?.tracks.find((t) => t.id === targetTrackId);

    expect(sourceTrack?.clips).toHaveLength(0);
    expect(targetTrack?.clips).toHaveLength(1);
    expect(targetTrack?.clips[0].startInFrames).toBe(10);
  });

  it('seeks to a frame within bounds', () => {
    useTimelineStore.getState().seekTo(50);
    expect(useTimelineStore.getState().currentFrame).toBe(50);

    useTimelineStore.getState().seekTo(-10);
    expect(useTimelineStore.getState().currentFrame).toBe(0);

    useTimelineStore.getState().seekTo(999);
    expect(useTimelineStore.getState().currentFrame).toBe(299);
  });

  it('toggles track visibility', () => {
    useTimelineStore.getState().toggleTrackVisibility('track-001');
    const state = useTimelineStore.getState();
    const track = state.timeline?.tracks.find((t) => t.id === 'track-001');
    expect(track?.visible).toBe(false);
  });

  it('caps history at MAX_UNDO_STEPS', () => {
    for (let i = 0; i < 55; i++) {
      useTimelineStore.getState().addTrack('text', `Track ${i}`);
    }
    expect(useTimelineStore.getState().history.past.length).toBeLessThanOrEqual(50);
  });
});
