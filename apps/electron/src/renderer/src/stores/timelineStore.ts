import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  type Clip,
  type Keyframe,
  type Timeline,
  type Track,
  type TrackType,
  type Transform,
  MAX_UNDO_STEPS,
} from '@easymotion/shared';

interface TimelineState {
  timeline: Timeline | null;
  currentFrame: number;
  isPlaying: boolean;
  playbackSpeed: number;
  loopRange: [number, number] | null;
  selectedTrackId: string | null;
  selectedClipId: string | null;
  selectedKeyframeId: string | null;
  history: { past: Timeline[]; future: Timeline[] };
  hasUnsavedChanges: boolean;
  isGenerating: boolean;
  generatorProgress: number;
}

interface TimelineActions {
  loadTimeline(timeline: Timeline): void;
  addTrack(type: TrackType, name?: string): string;
  removeTrack(trackId: string): void;
  reorderTracks(trackIds: string[]): void;
  toggleTrackVisibility(trackId: string): void;
  toggleTrackLock(trackId: string): void;
  addClip(trackId: string, clip: Clip): void;
  removeClip(trackId: string, clipId: string): void;
  moveClip(clipId: string, targetTrackId: string, newStartFrame: number): void;
  resizeClip(clipId: string, newDuration: number): void;
  updateClipTransform(clipId: string, transform: Partial<Transform>): void;
  addKeyframe(clipId: string, keyframe: Keyframe): void;
  removeKeyframe(clipId: string, keyframeId: string): void;
  updateKeyframe(clipId: string, keyframeId: string, updates: Partial<Keyframe>): void;
  selectTrack(trackId: string | null): void;
  selectClip(clipId: string | null): void;
  selectKeyframe(keyframeId: string | null): void;
  play(): void;
  pause(): void;
  seekTo(frame: number): void;
  setPlaybackSpeed(speed: number): void;
  setLoopRange(range: [number, number] | null): void;
  stepForward(frames?: number): void;
  stepBackward(frames?: number): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  clearHistory(): void;
  setGenerating(isGenerating: boolean, progress?: number): void;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

function saveHistory(state: TimelineState): void {
  if (!state.timeline) return;
  state.history.past.push(deepClone(state.timeline));
  if (state.history.past.length > MAX_UNDO_STEPS) {
    state.history.past.shift();
  }
  state.history.future = [];
}

function findClipAndTrack(
  timeline: Timeline,
  clipId: string
): { clip: Clip; track: Track } | null {
  for (const track of timeline.tracks) {
    const clip = track.clips.find((c) => c.id === clipId);
    if (clip) {
      return { clip, track };
    }
  }
  return null;
}

const initialState: TimelineState = {
  timeline: null,
  currentFrame: 0,
  isPlaying: false,
  playbackSpeed: 1,
  loopRange: null,
  selectedTrackId: null,
  selectedClipId: null,
  selectedKeyframeId: null,
  history: { past: [], future: [] },
  hasUnsavedChanges: false,
  isGenerating: false,
  generatorProgress: 0,
};

type TimelineStore = TimelineState & TimelineActions;

export const useTimelineStore = create<TimelineStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      loadTimeline: (timeline) => {
        set((state) => {
          state.timeline = timeline;
          state.history.past = [];
          state.history.future = [];
          state.hasUnsavedChanges = false;
          state.currentFrame = 0;
          state.isPlaying = false;
        });
      },

      addTrack: (type, name) => {
        const trackId = crypto.randomUUID();
        set((state) => {
          if (!state.timeline) return;
          saveHistory(state);
          const maxOrder = state.timeline.tracks.reduce(
            (max, t) => Math.max(max, t.order),
            -1
          );
          const newTrack: Track = {
            id: trackId,
            name: name || `${type} Track`,
            type,
            order: maxOrder + 1,
            visible: true,
            locked: false,
            clips: [],
          };
          state.timeline.tracks.push(newTrack);
          state.hasUnsavedChanges = true;
        });
        return trackId;
      },

      removeTrack: (trackId) => {
        set((state) => {
          if (!state.timeline) return;
          saveHistory(state);
          state.timeline.tracks = state.timeline.tracks.filter(
            (t) => t.id !== trackId
          );
          state.hasUnsavedChanges = true;
        });
      },

      reorderTracks: (trackIds) => {
        set((state) => {
          if (!state.timeline) return;
          saveHistory(state);
          const trackMap = new Map(state.timeline.tracks.map((t) => [t.id, t]));
          const reordered: Track[] = [];
          for (const id of trackIds) {
            const track = trackMap.get(id);
            if (track) {
              reordered.push(track);
            }
          }
          const existingIds = new Set(trackIds);
          for (const track of state.timeline.tracks) {
            if (!existingIds.has(track.id)) {
              reordered.push(track);
            }
          }
          reordered.forEach((track, index) => {
            track.order = index;
          });
          state.timeline.tracks = reordered;
          state.hasUnsavedChanges = true;
        });
      },

      toggleTrackVisibility: (trackId) => {
        set((state) => {
          if (!state.timeline) return;
          saveHistory(state);
          const track = state.timeline.tracks.find((t) => t.id === trackId);
          if (track) {
            track.visible = !track.visible;
            state.hasUnsavedChanges = true;
          }
        });
      },

      toggleTrackLock: (trackId) => {
        set((state) => {
          if (!state.timeline) return;
          saveHistory(state);
          const track = state.timeline.tracks.find((t) => t.id === trackId);
          if (track) {
            track.locked = !track.locked;
            state.hasUnsavedChanges = true;
          }
        });
      },

      addClip: (trackId, clip) => {
        set((state) => {
          if (!state.timeline) return;
          saveHistory(state);
          const track = state.timeline.tracks.find((t) => t.id === trackId);
          if (track) {
            track.clips.push(clip);
            state.hasUnsavedChanges = true;
          }
        });
      },

      removeClip: (trackId, clipId) => {
        set((state) => {
          if (!state.timeline) return;
          saveHistory(state);
          const track = state.timeline.tracks.find((t) => t.id === trackId);
          if (track) {
            track.clips = track.clips.filter((c) => c.id !== clipId);
            state.hasUnsavedChanges = true;
          }
        });
      },

      moveClip: (clipId, targetTrackId, newStartFrame) => {
        set((state) => {
          if (!state.timeline) return;
          saveHistory(state);
          const result = findClipAndTrack(state.timeline, clipId);
          if (!result) return;
          const { clip, track: sourceTrack } = result;
          sourceTrack.clips = sourceTrack.clips.filter((c) => c.id !== clipId);
          const targetTrack = state.timeline.tracks.find(
            (t) => t.id === targetTrackId
          );
          if (!targetTrack) return;
          clip.startInFrames = newStartFrame;
          targetTrack.clips.push(clip);
          state.hasUnsavedChanges = true;
        });
      },

      resizeClip: (clipId, newDuration) => {
        set((state) => {
          if (!state.timeline) return;
          saveHistory(state);
          for (const track of state.timeline.tracks) {
            const clip = track.clips.find((c) => c.id === clipId);
            if (clip) {
              clip.durationInFrames = newDuration;
              state.hasUnsavedChanges = true;
              return;
            }
          }
        });
      },

      updateClipTransform: (clipId, transform) => {
        set((state) => {
          if (!state.timeline) return;
          saveHistory(state);
          for (const track of state.timeline.tracks) {
            const clip = track.clips.find((c) => c.id === clipId);
            if (clip) {
              clip.transform = { ...clip.transform, ...transform };
              state.hasUnsavedChanges = true;
              return;
            }
          }
        });
      },

      addKeyframe: (clipId, keyframe) => {
        set((state) => {
          if (!state.timeline) return;
          saveHistory(state);
          for (const track of state.timeline.tracks) {
            const clip = track.clips.find((c) => c.id === clipId);
            if (clip) {
              clip.keyframes.push(keyframe);
              state.hasUnsavedChanges = true;
              return;
            }
          }
        });
      },

      removeKeyframe: (clipId, keyframeId) => {
        set((state) => {
          if (!state.timeline) return;
          saveHistory(state);
          for (const track of state.timeline.tracks) {
            const clip = track.clips.find((c) => c.id === clipId);
            if (clip) {
              clip.keyframes = clip.keyframes.filter((k) => k.id !== keyframeId);
              state.hasUnsavedChanges = true;
              return;
            }
          }
        });
      },

      updateKeyframe: (clipId, keyframeId, updates) => {
        set((state) => {
          if (!state.timeline) return;
          saveHistory(state);
          for (const track of state.timeline.tracks) {
            const clip = track.clips.find((c) => c.id === clipId);
            if (clip) {
              const keyframe = clip.keyframes.find((k) => k.id === keyframeId);
              if (keyframe) {
                Object.assign(keyframe, updates);
                state.hasUnsavedChanges = true;
              }
              return;
            }
          }
        });
      },

      selectTrack: (trackId) => {
        set((state) => {
          state.selectedTrackId = trackId;
        });
      },

      selectClip: (clipId) => {
        set((state) => {
          state.selectedClipId = clipId;
        });
      },

      selectKeyframe: (keyframeId) => {
        set((state) => {
          state.selectedKeyframeId = keyframeId;
        });
      },

      play: () => {
        set((state) => {
          state.isPlaying = true;
        });
      },

      pause: () => {
        set((state) => {
          state.isPlaying = false;
        });
      },

      seekTo: (frame) => {
        set((state) => {
          if (!state.timeline) return;
          state.currentFrame = Math.max(
            0,
            Math.min(frame, state.timeline.durationInFrames - 1)
          );
        });
      },

      setPlaybackSpeed: (speed) => {
        set((state) => {
          state.playbackSpeed = speed;
        });
      },

      setLoopRange: (range) => {
        set((state) => {
          state.loopRange = range;
        });
      },

      stepForward: (frames = 1) => {
        set((state) => {
          if (!state.timeline) return;
          state.currentFrame = Math.min(
            state.currentFrame + frames,
            state.timeline.durationInFrames - 1
          );
        });
      },

      stepBackward: (frames = 1) => {
        set((state) => {
          state.currentFrame = Math.max(0, state.currentFrame - frames);
        });
      },

      undo: () => {
        set((state) => {
          if (state.history.past.length === 0 || !state.timeline) return;
          const previous = state.history.past.pop()!;
          state.history.future.push(deepClone(state.timeline));
          state.timeline = previous;
          state.hasUnsavedChanges = true;
        });
      },

      redo: () => {
        set((state) => {
          if (state.history.future.length === 0 || !state.timeline) return;
          const next = state.history.future.pop()!;
          state.history.past.push(deepClone(state.timeline));
          state.timeline = next;
          state.hasUnsavedChanges = true;
        });
      },

      canUndo: () => {
        return get().history.past.length > 0;
      },

      canRedo: () => {
        return get().history.future.length > 0;
      },

      clearHistory: () => {
        set((state) => {
          state.history.past = [];
          state.history.future = [];
        });
      },

      setGenerating: (isGenerating, progress) => {
        set((state) => {
          state.isGenerating = isGenerating;
          if (progress !== undefined) {
            state.generatorProgress = progress;
          }
        });
      },
    })),
    { name: 'TimelineStore' }
  )
);
