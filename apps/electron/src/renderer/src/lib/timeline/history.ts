import type { Timeline } from "@/types/timeline";

export const MAX_HISTORY_STEPS = 50;

export interface TimelineHistory {
  past: Timeline[];
  future: Timeline[];
}

export function createHistory(): TimelineHistory {
  return { past: [], future: [] };
}

function cloneTimeline(timeline: Timeline): Timeline {
  return structuredClone(timeline);
}

export function pushHistory(
  history: TimelineHistory,
  previous: Timeline,
): TimelineHistory {
  const past = [...history.past, cloneTimeline(previous)];
  if (past.length > MAX_HISTORY_STEPS) {
    past.shift();
  }
  return { past, future: [] };
}

export function canUndo(history: TimelineHistory): boolean {
  return history.past.length > 0;
}

export function canRedo(history: TimelineHistory): boolean {
  return history.future.length > 0;
}

export function undoHistory(
  history: TimelineHistory,
  current: Timeline,
): { history: TimelineHistory; timeline: Timeline } | null {
  if (!canUndo(history)) return null;

  const past = [...history.past];
  const previous = past.pop()!;
  const future = [cloneTimeline(current), ...history.future];

  return {
    history: { past, future },
    timeline: previous,
  };
}

export function redoHistory(
  history: TimelineHistory,
  current: Timeline,
): { history: TimelineHistory; timeline: Timeline } | null {
  if (!canRedo(history)) return null;

  const future = [...history.future];
  const next = future.shift()!;
  const past = [...history.past, cloneTimeline(current)];

  return {
    history: { past, future },
    timeline: next,
  };
}
