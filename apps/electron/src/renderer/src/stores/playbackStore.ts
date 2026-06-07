import { create } from "zustand";
import { useTimelineStore } from "@/stores/timelineStore";

export interface PlaybackHandlers {
  seek: (frame: number) => void;
  play: () => void;
  pause: () => void;
}

interface PlaybackState {
  isPlaying: boolean;
  handlers: PlaybackHandlers | null;
  registerHandlers: (handlers: PlaybackHandlers) => void;
  unregisterHandlers: () => void;
  seekTo: (frame: number) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
}

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  isPlaying: false,
  handlers: null,

  registerHandlers: (handlers) => set({ handlers }),

  unregisterHandlers: () => set({ handlers: null }),

  seekTo: (frame) => {
    useTimelineStore.getState().setCurrentFrame(frame);
    get().handlers?.seek(frame);
  },

  togglePlay: () => {
    const next = !get().isPlaying;
    set({ isPlaying: next });
    if (next) {
      get().handlers?.play();
    } else {
      get().handlers?.pause();
    }
  },

  setPlaying: (isPlaying) => set({ isPlaying }),
}));
