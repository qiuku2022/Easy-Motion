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
  /** PR 风格入点/出点（I/O）；未设置时导出默认 0 → 最后有内容的帧 */
  workArea?: {
    inFrame: number;
    /** inclusive */
    outFrame: number;
  };
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
  /** 位置坐标原点；缺省视为旧版左上角，加载时迁移为 bottom-left */
  coordinateOrigin?: "bottom-left" | "top-left";
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

export type KeyframeEasing =
  | "linear"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "spring";

export type KeyframeInterpolation = "linear" | "bezier" | "hold";

export interface KeyframeBezierCp {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface KeyframeSpringConfig {
  damping: number;
  stiffness: number;
  mass?: number;
}

export type KeyframeValue = number | string | Record<string, unknown>;

export interface Keyframe {
  id: string;
  property: string;
  frame: number;
  value: KeyframeValue;
  easing?: KeyframeEasing;
  interpolation?: KeyframeInterpolation;
  /** Cubic-bezier control points (0–1), used when interpolation is `bezier`. */
  bezierCp?: KeyframeBezierCp;
  /** Spring physics config, used when easing is `spring`. */
  springConfig?: KeyframeSpringConfig;
}

export interface AnimationConfig {
  type:
    | "fade"
    | "slide-left"
    | "slide-right"
    | "slide-up"
    | "slide-down"
    | "scale-up"
    | "scale-down"
    | "rotate"
    | "blur"
    | "none";
  durationInFrames: number;
}

export interface Clip {
  id: string;
  type: string;
  name: string;
  startInFrames: number;
  durationInFrames: number;
  lastModifiedBy?: LastModifiedBy;
  lastModifiedAt?: number;
  source?: Record<string, unknown>;
  transform?: Record<string, unknown>;
  style?: Record<string, unknown>;
  keyframes?: Keyframe[];
  animations?: {
    in?: AnimationConfig;
    out?: AnimationConfig;
  };
}

export type GenerateTrigger = "debounced" | "immediate" | "none";

export interface ApplyTimelineOptions {
  recordHistory?: boolean;
  /** 500ms 内连续 debounced 操作合并为一步撤销 */
  mergeHistory?: boolean;
  generate?: GenerateTrigger;
}
