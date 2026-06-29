import type { Keyframe, KeyframeBezierCp, KeyframeEasing } from "@/types/timeline";
import { easyEaseBezierCp } from "@/lib/timeline/graph-editor/temporalEase";

/** CSS 标准 ease-in / ease-out（值图贝塞尔） */
const CSS_EASE_IN: KeyframeBezierCp = { x1: 0.42, y1: 0, x2: 1, y2: 1 };
const CSS_EASE_OUT: KeyframeBezierCp = { x1: 0, y1: 0, x2: 0.58, y2: 1 };

/**
 * 将缓动菜单选项映射为可播放 + 速度图可 sculpt 的关键帧 patch。
 * ease-* 必须配合 interpolation=bezier，否则速度图是折线三角（多项式导数）。
 */
export function easingKeyframePatch(
  easing: KeyframeEasing,
  prev: Keyframe | null,
  kf: Keyframe,
  fps: number,
): Partial<Keyframe> {
  if (easing === "spring") {
    return { easing: "spring", interpolation: "linear" };
  }
  if (easing === "linear" || !prev) {
    return { easing: "linear", interpolation: "linear" };
  }
  switch (easing) {
    case "ease-in-out":
      return {
        easing: "ease-in-out",
        interpolation: "bezier",
        bezierCp: easyEaseBezierCp(prev, kf, fps),
      };
    case "ease-in":
      return {
        easing: "ease-in",
        interpolation: "bezier",
        bezierCp: CSS_EASE_IN,
      };
    case "ease-out":
      return {
        easing: "ease-out",
        interpolation: "bezier",
        bezierCp: CSS_EASE_OUT,
      };
    default:
      return { easing: "linear", interpolation: "linear" };
  }
}
