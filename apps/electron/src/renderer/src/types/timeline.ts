/** 与 subproject.json / packages/shared 校验结构对齐 */

export const TRACK_TYPES = [
  "text",
  "image",
  "video",
  "audio",
  "shape",
  "chart",
  "animation",
  "group",
] as const;

export type TrackType = (typeof TRACK_TYPES)[number];

export interface SnapGrid {
  enabled: boolean;
  intervalInFrames: number;
}

export interface TimelineMarker {
  id: string;
  frame: number;
  name?: string;
  color?: string;
}

export interface Timeline {
  version: string;
  fps: number;
  durationInFrames: number;
  width: number;
  height: number;
  tracks: Track[];
  markers?: TimelineMarker[];
  snapGrid?: SnapGrid;
  /** Remotion 源码指纹，用于检测外部修改 */
  remotionFingerprint?: string;
  remotionSyncedAt?: number;
  remotionSyncSource?:
    | "generate"
    | "native"
    | "manifest"
    | "ast"
    | "native+manifest"
    | "native+ast"
    | "import"
    | "import-ast";
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  order: number;
  visible: boolean;
  locked: boolean;
  muted: boolean;
  /** 独奏：有任一轨道 solo 时，预览仅显示 solo 轨道 */
  solo?: boolean;
  clips: Clip[];
  /** 复合图层（group）包含的子轨道 */
  children?: Track[];
  /** 时间线中是否折叠子轨道 */
  collapsed?: boolean;
}

export type LastModifiedBy = "user" | "ai" | null;

export interface Clip {
  id: string;
  type: string;
  name: string;
  startInFrames: number;
  durationInFrames: number;
  lastModifiedBy?: LastModifiedBy;
  source?: Record<string, unknown>;
  transform?: Record<string, unknown>;
  style?: Record<string, unknown>;
  keyframes?: unknown[];
  animations?: Record<string, unknown>;
}

export type GenerateTrigger = "debounced" | "immediate" | "none";

export interface ApplyTimelineOptions {
  recordHistory?: boolean;
  /** 500ms 内连续 debounced 操作合并为一步撤销 */
  mergeHistory?: boolean;
  generate?: GenerateTrigger;
}
