/**
 * 属性面板可编辑字段 — 对齐 docs/requirements/代码生成规范.md Layer Props
 * 与 docs/requirements/数据字典汇总.md Clip 字段
 */
import type { Clip, TrackType } from "@/types/timeline";
import type { ClipPatch } from "@/lib/timeline/mutations";
import { getValueByPath } from "@/lib/timeline/objectPath";
import { isKnownTrackType } from "@/lib/timeline/contentType";

export type PropertyFieldType = "text" | "multiline" | "number" | "color";

export interface ClipPropertyField {
  path: string;
  label: string;
  type: PropertyFieldType;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  /** 单位显示在标签后（默认在输入框后） */
  suffixOnLabel?: boolean;
  /** 常用调整区（UI 文档 §5.3） */
  quick?: boolean;
}

/** 各 clip 类型的可编辑属性（与 TextLayerProps / ImageLayerProps 等一致） */
export const CLIP_PROPERTY_FIELDS: Record<string, ClipPropertyField[]> = {
  text: [
    { path: "source.content", label: "文字内容", type: "multiline", quick: true },
    { path: "style.fontSize", label: "字体大小", type: "number", min: 1, suffix: "px", quick: true },
    { path: "style.color", label: "颜色", type: "color", quick: true },
    { path: "style.fontFamily", label: "字体", type: "text" },
    { path: "transform.position.x", label: "位置 X", type: "number", quick: true },
    { path: "transform.position.y", label: "位置 Y", type: "number", quick: true },
  ],
  image: [
    { path: "source.publicPath", label: "资源路径", type: "text", quick: true },
    { path: "source.path", label: "路径", type: "text" },
    { path: "transform.scale", label: "缩放", type: "number", min: 0.01, step: 0.01, quick: true },
  ],
  video: [
    { path: "source.publicPath", label: "资源路径", type: "text", quick: true },
    { path: "source.path", label: "路径", type: "text" },
    { path: "transform.scale", label: "缩放", type: "number", min: 0.01, step: 0.01, quick: true },
  ],
  audio: [
    { path: "source.publicPath", label: "资源路径", type: "text", quick: true },
    { path: "source.path", label: "路径", type: "text" },
  ],
  shape: [
    { path: "style.fillColor", label: "填充色", type: "color", quick: true },
    { path: "source.width", label: "宽度", type: "number", min: 1, quick: true },
    { path: "source.height", label: "高度", type: "number", min: 1, quick: true },
  ],
  chart: [
    { path: "source.title", label: "标题", type: "text", quick: true },
    { path: "source.chartType", label: "图表类型", type: "text", quick: true },
    { path: "style.primaryColor", label: "主色", type: "color", quick: true },
    { path: "style.backgroundColor", label: "背景色", type: "color", quick: true },
  ],
};

export const TRANSFORM_FIELDS: ClipPropertyField[] = [
  { path: "transform.position.x", label: "位置 X", type: "number" },
  { path: "transform.position.y", label: "位置 Y", type: "number" },
  { path: "transform.scale", label: "缩放", type: "number", min: 0.01, step: 0.01 },
  { path: "transform.rotation", label: "旋转", type: "number", suffix: "°", suffixOnLabel: true },
  { path: "transform.opacity", label: "透明度", type: "number", min: 0, max: 1, step: 0.01 },
];

export const ANIMATION_FIELDS: ClipPropertyField[] = [
  {
    path: "animations.in.type",
    label: "入场动画",
    type: "text",
    quick: true,
  },
  {
    path: "animations.in.durationInFrames",
    label: "入场时长",
    type: "number",
    min: 1,
    suffix: "f",
    quick: true,
  },
];

/** 推断用于属性面板的 clip 内容类型（clip.type 优先，其次 source 结构） */
export function resolveEditableClipType(clip: Clip, trackType: TrackType): TrackType | null {
  if (isKnownTrackType(clip.type) && clip.type !== "group") {
    return clip.type;
  }
  const source = clip.source;
  if (source?.kind === "inline") {
    if (typeof source.content === "string") return "text";
    if (source.shape) return "shape";
  }
  if (source?.kind === "asset" || source?.publicPath || source?.path) {
    if (trackType === "video" || trackType === "audio" || trackType === "image") {
      return trackType;
    }
    return "image";
  }
  if (trackType !== "group" && isKnownTrackType(trackType)) {
    return trackType;
  }
  return null;
}

export function getFieldsForClipType(type: TrackType | null): ClipPropertyField[] {
  if (!type) return [];
  return CLIP_PROPERTY_FIELDS[type] ?? [];
}

export function getClipPropertyValue(clip: Clip, path: string): unknown {
  if (path === "source.publicPath" || path === "source.path") {
    const source = clip.source ?? {};
    return source.publicPath ?? source.path ?? "";
  }
  if (path === "animations.in.type") {
    return clip.animations?.in?.type ?? "none";
  }
  if (path === "animations.in.durationInFrames") {
    return clip.animations?.in?.durationInFrames ?? 15;
  }
  if (path === "source.title") {
    const source = clip.source ?? {};
    return source.title ?? clip.style?.title ?? "";
  }
  if (path === "source.chartType") {
    return clip.source?.chartType ?? "line";
  }
  return getValueByPath(clip as Record<string, unknown>, path);
}

/** 将属性路径转为 updateClip 可合并的 patch */
export function buildPatchFromPropertyPath(path: string, value: unknown): ClipPatch {
  if (path === "source.content") {
    return { source: { kind: "inline", content: String(value) } };
  }
  if (path.startsWith("source.")) {
    const key = path.slice("source.".length);
    return { source: { [key]: value } };
  }
  if (path.startsWith("style.")) {
    const key = path.slice("style.".length);
    return { style: { [key]: value } };
  }
  if (path === "transform.position.x") {
    return { transform: { position: { x: Number(value) } } };
  }
  if (path === "transform.position.y") {
    return { transform: { position: { y: Number(value) } } };
  }
  if (path === "transform.scale") {
    return { transform: { scale: Number(value) } };
  }
  if (path === "transform.rotation") {
    return { transform: { rotation: Number(value) } };
  }
  if (path === "transform.opacity") {
    return { transform: { opacity: Number(value) } };
  }
  if (path === "animations.in.type") {
    return { animations: { in: { type: String(value) } } };
  }
  if (path === "animations.in.durationInFrames") {
    return { animations: { in: { durationInFrames: Number(value) } } };
  }
  if (path === "source.title") {
    return { source: { title: String(value) }, style: { title: String(value) } };
  }
  if (path === "source.chartType") {
    const chartType = String(value) === "bar" ? "bar" : "line";
    return { source: { chartType } };
  }
  return {};
}
