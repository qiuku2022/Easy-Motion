import type { CSSProperties } from "react";

export type LayerScreenPosition = {
  left: number;
  top: number;
};

export type LayerAnchorTransform = {
  scale: number;
  rotation: number;
  opacity: number;
};

/** 图层中心为锚点：left/top 为锚点坐标，transform 含 translate(-50%, -50%) */
export function buildCenterAnchorTransformCss(
  scale: number,
  rotation: number,
): string {
  return `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`;
}

export function buildCenterAnchoredLayerStyle(
  screen: LayerScreenPosition,
  transform: LayerAnchorTransform,
): CSSProperties {
  return {
    position: "absolute",
    left: screen.left,
    top: screen.top,
    transform: buildCenterAnchorTransformCss(transform.scale, transform.rotation),
    opacity: transform.opacity,
    transformOrigin: "center center",
  };
}
