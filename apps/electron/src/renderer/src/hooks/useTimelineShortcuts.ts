import { useEffect } from "react";
import { isModKey } from "@/lib/keyboard";
import {
  collectEditPoints,
  seekNextEditPoint,
  seekPrevEditPoint,
} from "@/lib/timeline/editPoints";
import { usePlaybackStore } from "@/stores/playbackStore";
import { useProjectStore } from "@/stores/projectStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useUiStore } from "@/stores/uiStore";

const PR_STEP_MANY_FRAMES = 5;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

function seekByDelta(delta: number) {
  const timeline = useTimelineStore.getState().timeline;
  if (!timeline) return;
  const max = Math.max(0, timeline.durationInFrames - 1);
  const next = Math.min(
    max,
    Math.max(0, useTimelineStore.getState().currentFrame + delta),
  );
  usePlaybackStore.getState().seekTo(next);
}

function seekToFrame(frame: number) {
  const timeline = useTimelineStore.getState().timeline;
  if (!timeline) return;
  const max = Math.max(0, timeline.durationInFrames - 1);
  usePlaybackStore.getState().seekTo(Math.min(max, Math.max(0, frame)));
}

function handleTimelineZoom(e: KeyboardEvent): boolean {
  const ui = useUiStore.getState();
  const zoomIn = e.key === "=" || e.key === "+";
  const zoomOut = e.key === "-" || e.key === "_";
  const fit = e.key === "\\";

  if (isModKey(e) && !e.altKey && !e.shiftKey) {
    if (zoomIn) {
      e.preventDefault();
      ui.zoomTimelineBy(0.5);
      return true;
    }
    if (zoomOut) {
      e.preventDefault();
      ui.zoomTimelineBy(-0.5);
      return true;
    }
    if (e.key === "0") {
      e.preventDefault();
      ui.requestTimelineFit();
      return true;
    }
  }

  if (!isModKey(e) && !e.altKey && !e.shiftKey) {
    if (zoomIn) {
      e.preventDefault();
      ui.zoomTimelineBy(0.5);
      return true;
    }
    if (zoomOut) {
      e.preventDefault();
      ui.zoomTimelineBy(-0.5);
      return true;
    }
    if (fit) {
      e.preventDefault();
      ui.requestTimelineFit();
      return true;
    }
  }

  return false;
}

/**
 * Premiere Pro 风格全局快捷键
 * Space 播放、J/K/L 穿梭、←→ 逐帧、↑↓ 剪辑点、S 吸附、=/- 缩放、\ 适配 等
 */
export function useTimelineShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        useUiStore.getState().setAltKeyHeld(true);
      }

      if (isEditableTarget(e.target)) return;

      const timeline = useTimelineStore.getState().timeline;
      const store = useTimelineStore.getState();
      const playback = usePlaybackStore.getState();

      if (isModKey(e) && e.key.toLowerCase() === "s" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        void useProjectStore.getState().saveProject();
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        playback.togglePlay();
        return;
      }

      if (!isModKey(e) && !e.altKey && !e.shiftKey && timeline) {
        if (e.key.toLowerCase() === "k") {
          e.preventDefault();
          if (playback.isPlaying) playback.togglePlay();
          return;
        }
        if (e.key.toLowerCase() === "l") {
          e.preventDefault();
          if (!playback.isPlaying) playback.togglePlay();
          return;
        }
        if (e.key.toLowerCase() === "j") {
          e.preventDefault();
          if (playback.isPlaying) {
            playback.togglePlay();
          } else {
            seekByDelta(-1);
          }
          return;
        }
      }

      if (isModKey(e) && e.key.toLowerCase() === "z" && !e.altKey) {
        e.preventDefault();
        if (e.shiftKey) {
          store.redo();
        } else {
          store.undo();
        }
        return;
      }
      if (isModKey(e) && e.key.toLowerCase() === "y" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        store.redo();
        return;
      }

      if (isModKey(e) && e.key.toLowerCase() === "k" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        store.clearError();
        store.splitSelectedClipAtPlayhead();
        return;
      }

      if (!isModKey(e) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        useUiStore.getState().toggleSnapEnabled();
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (store.selectedMarkerId) {
          e.preventDefault();
          store.clearError();
          store.removeSelectedMarker();
          return;
        }
        if (!store.selectedClipId) return;
        e.preventDefault();
        store.clearError();
        store.deleteSelectedClip();
        return;
      }

      if (!isModKey(e) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        store.clearError();
        store.toggleMarkerAtPlayhead();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        store.clearSelection();
        return;
      }

      if (isModKey(e) && e.shiftKey && e.key.toLowerCase() === "a" && !e.altKey) {
        e.preventDefault();
        store.clearSelection();
        return;
      }

      if (handleTimelineZoom(e)) return;

      if (!timeline) return;

      const currentFrame = store.currentFrame;
      const editPoints = collectEditPoints(timeline);

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        seekByDelta(e.shiftKey ? -PR_STEP_MANY_FRAMES : -1);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        seekByDelta(e.shiftKey ? PR_STEP_MANY_FRAMES : 1);
        return;
      }

      if (e.key === "ArrowUp" && !isModKey(e)) {
        e.preventDefault();
        seekToFrame(seekPrevEditPoint(currentFrame, editPoints));
        return;
      }
      if (e.key === "ArrowDown" && !isModKey(e)) {
        e.preventDefault();
        seekToFrame(seekNextEditPoint(currentFrame, editPoints));
        return;
      }

      if (e.key === "Home") {
        e.preventDefault();
        seekToFrame(0);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        seekToFrame(timeline.durationInFrames - 1);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        useUiStore.getState().setAltKeyHeld(false);
      }
    };

    const onBlur = () => {
      useUiStore.getState().setAltKeyHeld(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);
}
