import type { TrackType } from "@/types/timeline";
import { TRACK_TYPES } from "@/types/timeline";

export const TRACK_TYPE_LABELS: Record<TrackType, string> = {
  text: "文字",
  image: "图片",
  video: "视频",
  audio: "音频",
  shape: "形状",
  chart: "图表",
  animation: "动画",
  group: "分组",
};

/** 工具栏「添加轨道」常用类型（分组放后面） */
export const ADD_TRACK_TYPES: TrackType[] = TRACK_TYPES.filter((t) => t !== "group");

export function defaultTrackName(type: TrackType): string {
  return `新${TRACK_TYPE_LABELS[type]}轨道`;
}
