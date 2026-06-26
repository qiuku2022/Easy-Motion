import { useEffect } from "react";
import { isEditableElement, isModKey } from "@/lib/keyboard";
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
  return (
    isEditableElement(target as Element) ||
    isEditableElement(document.activeElement)
  );
}

function consumeShortcut(e: KeyboardEvent) {
  e.preventDefault();
  e.stopPropagation();
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
      consumeShortcut(e);
      ui.zoomTimelineBy(0.5);
      return true;
    }
    if (zoomOut) {
      consumeShortcut(e);
      ui.zoomTimelineBy(-0.5);
      return true;
    }
    if (e.key === "0") {
      consumeShortcut(e);
      ui.requestTimelineFit();
      return true;
    }
  }

  if (!isModKey(e) && !e.altKey && !e.shiftKey) {
    if (zoomIn) {
      consumeShortcut(e);
      ui.zoomTimelineBy(0.5);
      return true;
    }
    if (zoomOut) {
      consumeShortcut(e);
      ui.zoomTimelineBy(-0.5);
      return true;
    }
    if (fit) {
      consumeShortcut(e);
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
    const syncAltKeyHeld = (e: KeyboardEvent | PointerEvent) => {
      useUiStore.getState().setAltKeyHeld(e.altKey);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      syncAltKeyHeld(e);

      if (isEditableTarget(e.target)) return;

      const timeline = useTimelineStore.getState().timeline;
      const store = useTimelineStore.getState();
      const playback = usePlaybackStore.getState();

      if (isModKey(e) && e.key.toLowerCase() === "s" && !e.shiftKey && !e.altKey) {
        consumeShortcut(e);
        void useProjectStore.getState().saveProject();
        return;
      }

      if (e.code === "Space") {
        consumeShortcut(e);
        playback.togglePlay();
        return;
      }

      if (!isModKey(e) && !e.altKey && !e.shiftKey && timeline) {
        if (e.key.toLowerCase() === "k") {
          consumeShortcut(e);
          if (playback.isPlaying) playback.togglePlay();
          return;
        }
        if (e.key.toLowerCase() === "l") {
          consumeShortcut(e);
          if (!playback.isPlaying) playback.togglePlay();
          return;
        }
        if (e.key.toLowerCase() === "j") {
          consumeShortcut(e);
          if (playback.isPlaying) {
            playback.togglePlay();
          } else {
            seekByDelta(-1);
          }
          return;
        }
      }

      if (isModKey(e) && e.key.toLowerCase() === "z" && !e.altKey) {
        consumeShortcut(e);
        if (e.shiftKey) {
          store.redo();
        } else {
          store.undo();
        }
        return;
      }
      if (isModKey(e) && e.key.toLowerCase() === "y" && !e.shiftKey && !e.altKey) {
        consumeShortcut(e);
        store.redo();
        return;
      }

      if (isModKey(e) && e.key.toLowerCase() === "k" && !e.shiftKey && !e.altKey) {
        consumeShortcut(e);
        store.clearError();
        store.splitSelectedClipAtPlayhead();
        return;
      }

      if (!isModKey(e) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "s") {
        consumeShortcut(e);
        useUiStore.getState().toggleSnapEnabled();
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (store.selectedMarkerId) {
          consumeShortcut(e);
          store.clearError();
          store.removeSelectedMarker();
          return;
        }
        if (!store.selectedClipId) return;
        consumeShortcut(e);
        store.clearError();
        store.deleteSelectedClip();
        return;
      }

      if (!isModKey(e) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "m") {
        consumeShortcut(e);
        store.clearError();
        store.toggleMarkerAtPlayhead();
        return;
      }

      if (!isModKey(e) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "i") {
        consumeShortcut(e);
        store.clearError();
        store.setInPointAtPlayhead();
        return;
      }

      if (!isModKey(e) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "o") {
        consumeShortcut(e);
        store.clearError();
        store.setOutPointAtPlayhead();
        return;
      }

      if (!isModKey(e) && !e.altKey && e.shiftKey && e.key.toLowerCase() === "x") {
        consumeShortcut(e);
        store.clearWorkArea();
        return;
      }

      if (e.key === "Escape") {
        consumeShortcut(e);
        store.clearSelection();
        return;
      }

      if (isModKey(e) && e.shiftKey && e.key.toLowerCase() === "a" && !e.altKey) {
        consumeShortcut(e);
        store.clearSelection();
        return;
      }

      if (handleTimelineZoom(e)) return;

      if (!timeline) return;

      const currentFrame = store.currentFrame;
      const editPoints = collectEditPoints(timeline);

      if (e.key === "ArrowLeft") {
        consumeShortcut(e);
        seekByDelta(e.shiftKey ? -PR_STEP_MANY_FRAMES : -1);
        return;
      }
      if (e.key === "ArrowRight") {
        consumeShortcut(e);
        seekByDelta(e.shiftKey ? PR_STEP_MANY_FRAMES : 1);
        return;
      }

      if (e.key === "ArrowUp" && !isModKey(e)) {
        consumeShortcut(e);
        seekToFrame(seekPrevEditPoint(currentFrame, editPoints));
        return;
      }
      if (e.key === "ArrowDown" && !isModKey(e)) {
        consumeShortcut(e);
        seekToFrame(seekNextEditPoint(currentFrame, editPoints));
        return;
      }

      if (e.key === "Home") {
        consumeShortcut(e);
        seekToFrame(0);
        return;
      }
      if (e.key === "End") {
        consumeShortcut(e);
        seekToFrame(timeline.durationInFrames - 1);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      syncAltKeyHeld(e);
    };

    const onBlur = () => {
      useUiStore.getState().setAltKeyHeld(false);
    };

    // capture：先于 Radix Tabs 等组件处理方向键/空格，避免 shadcn 迁移后焦点在标签/按钮上时快捷键失效
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("pointerdown", syncAltKeyHeld, true);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerdown", syncAltKeyHeld, true);
      window.removeEventListener("blur", onBlur);
    };
  }, []);
}
