import { modKeyLabel } from "@/lib/keyboard";

/**
 * Premiere Pro 默认快捷键文案（用于 tooltip / 错误提示）
 * @see docs/requirements/UI布局与交互设计-优化版.md §10.1
 */
export const PR_SHORTCUTS = {
  playPause: "Space",
  pause: "K",
  playForward: "L",
  stepBack: "J",
  undo: `${modKeyLabel()}+Z`,
  redo: `${modKeyLabel()}+Shift+Z`,
  redoAltWin: `${modKeyLabel()}+Y`,
  save: `${modKeyLabel()}+S`,
  addEdit: `${modKeyLabel()}+K`,
  addMarker: "M",
  delete: "Delete",
  stepFrameBack: "←",
  stepFrameForward: "→",
  stepManyBack: "Shift+←",
  stepManyForward: "Shift+→",
  prevEdit: "↑",
  nextEdit: "↓",
  /** 键盘缩放（PR 时间线面板聚焦时） */
  zoomIn: "= / +",
  zoomOut: "-",
  fitTimeline: "\\",
  fitTimelineAlt: `${modKeyLabel()}+0`,
  /** 鼠标（PR 默认） */
  wheelPanHorizontal: "滚轮",
  wheelZoom: "Alt+滚轮",
  wheelPanVertical: "Ctrl+滚轮",
  snapToggle: "S",
  deselect: "Esc",
  deselectAll: `${modKeyLabel()}+Shift+A`,
  goToStart: "Home",
  goToEnd: "End",
} as const;
