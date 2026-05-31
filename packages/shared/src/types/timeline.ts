export type ClipType = 'text' | 'image' | 'video' | 'audio' | 'shape' | 'chart' | 'animation' | 'group';

export type TrackType = 'text' | 'image' | 'video' | 'audio' | 'shape' | 'chart' | 'animation' | 'group' | 'visual' | 'audio-track';

export interface Position {
  x: number;
  y: number;
}

export interface Transform {
  position: Position;
  scale: number;
  rotation: number;
  opacity: number;
}

export type ClipSourceKind = 'inline' | 'asset' | 'data';

export interface InlineSource {
  kind: 'inline';
  content: string;
}

export interface AssetSource {
  kind: 'asset';
  assetId: string;
  path: string;
}

export interface DataSource {
  kind: 'data';
  file: string;
  field?: string;
}

export type ClipSource = InlineSource | AssetSource | DataSource;

export interface AnimationConfig {
  type: string;
  durationInFrames: number;
}

export interface Keyframe {
  id: string;
  property: string;
  frame: number;
  value: number | string;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring';
  interpolation: 'linear' | 'bezier' | 'hold';
}

export interface TextStyle {
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
  letterSpacing?: number;
  fontWeight?: 'normal' | 'bold' | number;
  textShadow?: { color: string; offsetX: number; offsetY: number; blur: number };
}

export interface ShapeStyle {
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
  shapeType?: 'rect' | 'circle';
  width?: number;
  height?: number;
}

export interface ImageStyle {
  objectFit?: 'cover' | 'contain' | 'fill';
  borderRadius?: number;
  filter?: string;
}

export interface Clip {
  id: string;
  name: string;
  type: ClipType;
  startInFrames: number;
  durationInFrames: number;
  source: ClipSource;
  transform: Transform;
  style?: TextStyle | ShapeStyle | ImageStyle | Record<string, unknown>;
  keyframes: Keyframe[];
  animations?: {
    in?: AnimationConfig;
    out?: AnimationConfig;
  };
  lastModifiedBy?: 'user' | 'ai' | null;
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  order: number;
  visible: boolean;
  locked: boolean;
  muted?: boolean;
  clips: Clip[];
  children?: Track[];
  collapsed?: boolean;
}

export interface SnapGrid {
  enabled: boolean;
  intervalInFrames: number;
}

export interface Timeline {
  id: string;
  version: string;
  fps: number;
  durationInFrames: number;
  width: number;
  height: number;
  tracks: Track[];
  snapGrid?: SnapGrid;
}
