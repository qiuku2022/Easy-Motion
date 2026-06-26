import { create } from "zustand";
import {
  DEFAULT_PX_PER_FRAME,
  clampPxPerFrame,
} from "@/lib/timeline/framePixels";

export type LeftTab = "project" | "assets" | "presets";
export type RightTab = "properties" | "assets" | "templates" | "ai";

interface UiState {
  leftPanelWidth: number;
  rightPanelWidth: number;
  timelineHeight: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  timelineCollapsed: boolean;
  leftTab: LeftTab;
  rightTab: RightTab;

  /** 时间线缩放：像素/帧 */
  pxPerFrame: number;
  /** 时间线内容区水平滚动（像素） */
  timelineScrollX: number;
  /** 吸附开关（工具栏 🧲） */
  snapEnabled: boolean;
  /** Alt 按住时临时禁用吸附 */
  altKeyHeld: boolean;
  /** 递增时触发时间线「适配窗口」 */
  fitTimelineNonce: number;
  /** 用户手动缩放后，避免 ResizeObserver 自动「适配」抢回缩放 */
  timelineZoomManual: boolean;
  /** 时间线下方关键帧轨道面板 */
  keyframePanelExpanded: boolean;
  selectedKeyframeProperty: string | null;

  setLeftPanelWidth: (w: number) => void;
  setRightPanelWidth: (w: number) => void;
  setTimelineHeight: (h: number) => void;
  toggleLeftCollapsed: () => void;
  toggleRightCollapsed: () => void;
  toggleTimelineCollapsed: () => void;
  setLeftTab: (tab: LeftTab) => void;
  setRightTab: (tab: RightTab) => void;
  setPxPerFrame: (px: number) => void;
  setTimelineScrollX: (px: number) => void;
  toggleSnapEnabled: () => void;
  setAltKeyHeld: (held: boolean) => void;
  toggleKeyframePanel: () => void;
  setSelectedKeyframeProperty: (property: string | null) => void;
  zoomTimelineBy: (delta: number) => void;
  requestTimelineFit: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  leftPanelWidth: 280,
  rightPanelWidth: 360,
  timelineHeight: 260,
  leftCollapsed: false,
  rightCollapsed: false,
  timelineCollapsed: false,
  leftTab: "project",
  rightTab: "properties",

  pxPerFrame: DEFAULT_PX_PER_FRAME,
  timelineScrollX: 0,
  snapEnabled: true,
  altKeyHeld: false,
  fitTimelineNonce: 0,
  timelineZoomManual: false,
  keyframePanelExpanded: true,
  selectedKeyframeProperty: "transform.opacity",

  setLeftPanelWidth: (leftPanelWidth) => set({ leftPanelWidth }),
  setRightPanelWidth: (rightPanelWidth) => set({ rightPanelWidth }),
  setTimelineHeight: (timelineHeight) => set({ timelineHeight }),
  toggleLeftCollapsed: () => set((s) => ({ leftCollapsed: !s.leftCollapsed })),
  toggleRightCollapsed: () => set((s) => ({ rightCollapsed: !s.rightCollapsed })),
  toggleTimelineCollapsed: () =>
    set((s) => ({ timelineCollapsed: !s.timelineCollapsed })),
  setLeftTab: (leftTab) => set({ leftTab }),
  setRightTab: (rightTab) => set({ rightTab }),
  setPxPerFrame: (px) => set({ pxPerFrame: clampPxPerFrame(px) }),
  setTimelineScrollX: (timelineScrollX) =>
    set({ timelineScrollX: Math.max(0, timelineScrollX) }),
  toggleSnapEnabled: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
  setAltKeyHeld: (altKeyHeld) => set({ altKeyHeld }),

  toggleKeyframePanel: () =>
    set((s) => ({ keyframePanelExpanded: !s.keyframePanelExpanded })),

  setSelectedKeyframeProperty: (selectedKeyframeProperty) =>
    set({ selectedKeyframeProperty }),

  zoomTimelineBy: (delta) =>
    set((s) => ({
      pxPerFrame: clampPxPerFrame(s.pxPerFrame + delta),
      timelineZoomManual: true,
    })),

  requestTimelineFit: () =>
    set((s) => ({
      fitTimelineNonce: s.fitTimelineNonce + 1,
      timelineZoomManual: false,
    })),
}));
