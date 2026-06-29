import { create } from "zustand";
import {
  DEFAULT_PX_PER_FRAME,
  clampPxPerFrame,
} from "@/lib/timeline/framePixels";
import { scheduleKeyframePanelSave } from "@/lib/workspace/projectWorkspace";

export type LeftTab = "project" | "assets" | "presets";
export type RightTab = "properties" | "templates";
/** 关键帧图编辑器纵轴：速度图（AE 默认）或值图 */
export type KeyframeGraphMode = "speed" | "value";
/** Premiere：时间码 SMPTE 或纯帧计数（Ctrl+点击 Transport 切换） */
export type TimelineTimeDisplay = "timecode" | "frames";

/** 与 AppLayout 面板拖拽范围一致 */
export const LEFT_PANEL_WIDTH_MIN = 200;
export const LEFT_PANEL_WIDTH_MAX = 360;
export const RIGHT_PANEL_WIDTH_MIN = 240;
export const RIGHT_PANEL_WIDTH_MAX = 380;
export const AI_PANEL_WIDTH_MIN = 280;
export const AI_PANEL_WIDTH_MAX = 480;
export const TIMELINE_HEIGHT_MIN = 160;
export const TIMELINE_HEIGHT_MAX = 480;

interface UiState {
  leftPanelWidth: number;
  rightPanelWidth: number;
  aiPanelWidth: number;
  timelineHeight: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  aiCollapsed: boolean;
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
  selectedKeyframeId: string | null;
  keyframeGraphMode: KeyframeGraphMode;
  /** 时间线标尺与 Transport 时间显示 */
  timelineTimeDisplay: TimelineTimeDisplay;

  setLeftPanelWidth: (w: number) => void;
  setRightPanelWidth: (w: number) => void;
  setAiPanelWidth: (w: number) => void;
  setTimelineHeight: (h: number) => void;
  toggleLeftCollapsed: () => void;
  toggleRightCollapsed: () => void;
  toggleAiCollapsed: () => void;
  toggleTimelineCollapsed: () => void;
  setLeftTab: (tab: LeftTab) => void;
  setRightTab: (tab: RightTab) => void;
  setPxPerFrame: (px: number) => void;
  setTimelineScrollX: (px: number) => void;
  toggleSnapEnabled: () => void;
  setAltKeyHeld: (held: boolean) => void;
  toggleKeyframePanel: () => void;
  setSelectedKeyframeProperty: (property: string | null) => void;
  setSelectedKeyframeId: (keyframeId: string | null) => void;
  setKeyframeGraphMode: (mode: KeyframeGraphMode) => void;
  toggleTimelineTimeDisplay: () => void;
  zoomTimelineBy: (delta: number) => void;
  requestTimelineFit: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  leftPanelWidth: 252,
  rightPanelWidth: 280,
  aiPanelWidth: 320,
  timelineHeight: TIMELINE_HEIGHT_MAX,
  leftCollapsed: false,
  rightCollapsed: false,
  aiCollapsed: false,
  timelineCollapsed: false,
  leftTab: "project",
  rightTab: "properties",

  pxPerFrame: DEFAULT_PX_PER_FRAME,
  timelineScrollX: 0,
  snapEnabled: true,
  altKeyHeld: false,
  fitTimelineNonce: 0,
  timelineZoomManual: false,
  keyframePanelExpanded: false,
  selectedKeyframeProperty: "transform.opacity",
  selectedKeyframeId: null,
  keyframeGraphMode: "speed",
  timelineTimeDisplay: "timecode",

  setLeftPanelWidth: (leftPanelWidth) => set({ leftPanelWidth }),
  setRightPanelWidth: (rightPanelWidth) => set({ rightPanelWidth }),
  setAiPanelWidth: (aiPanelWidth) => set({ aiPanelWidth }),
  setTimelineHeight: (timelineHeight) => set({ timelineHeight }),
  toggleLeftCollapsed: () => set((s) => ({ leftCollapsed: !s.leftCollapsed })),
  toggleRightCollapsed: () => set((s) => ({ rightCollapsed: !s.rightCollapsed })),
  toggleAiCollapsed: () => set((s) => ({ aiCollapsed: !s.aiCollapsed })),
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
    set((s) => {
      const keyframePanelExpanded = !s.keyframePanelExpanded;
      scheduleKeyframePanelSave(keyframePanelExpanded);
      return { keyframePanelExpanded };
    }),

  setSelectedKeyframeProperty: (selectedKeyframeProperty) =>
    set({ selectedKeyframeProperty, selectedKeyframeId: null }),

  setSelectedKeyframeId: (selectedKeyframeId) => set({ selectedKeyframeId }),

  setKeyframeGraphMode: (keyframeGraphMode) => set({ keyframeGraphMode }),

  toggleTimelineTimeDisplay: () =>
    set((s) => ({
      timelineTimeDisplay:
        s.timelineTimeDisplay === "timecode" ? "frames" : "timecode",
    })),

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
