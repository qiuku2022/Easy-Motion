import { useEffect, useState, type RefObject } from "react";

export const PREVIEW_PADDING = 24;

/** 预览区展示比例（布局与画布均锁定 16:9） */
export const PREVIEW_DISPLAY_ASPECT = 16 / 9;

/** 在容器内按宽高比 fit，返回内容区像素尺寸 */
export function fitAspectBox(
  containerWidth: number,
  containerHeight: number,
  aspectRatio: number,
  padding = PREVIEW_PADDING
) {
  const innerW = Math.max(0, containerWidth - padding);
  const innerH = Math.max(0, containerHeight - padding);
  if (innerW <= 0 || innerH <= 0) {
    return { width: 0, height: 0 };
  }

  let width = innerW;
  let height = width / aspectRatio;
  if (height > innerH) {
    height = innerH;
    width = height * aspectRatio;
  }

  return {
    width: Math.floor(width),
    height: Math.floor(height),
  };
}

export function usePreviewAspectFit(
  containerRef: RefObject<HTMLElement | null>,
  aspectRatio: number,
  padding = PREVIEW_PADDING
) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize(fitAspectBox(rect.width, rect.height, aspectRatio, padding));
    };

    const observer = new ResizeObserver(update);
    observer.observe(el);
    update();
    return () => observer.disconnect();
  }, [aspectRatio, containerRef, padding]);

  return size;
}

/** 预览列宽度：按行高与宽高比计算，多余横向空间留给左右面板 */
export function usePreviewColumnWidth(
  rowRef: RefObject<HTMLElement | null>,
  aspectRatio: number,
  padding = PREVIEW_PADDING,
  minWidth = 320
) {
  const [width, setWidth] = useState(minWidth);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    const update = () => {
      const h = el.getBoundingClientRect().height;
      const innerH = Math.max(0, h - padding);
      setWidth(Math.max(minWidth, Math.floor(innerH * aspectRatio + padding)));
    };

    const observer = new ResizeObserver(update);
    observer.observe(el);
    update();
    return () => observer.disconnect();
  }, [aspectRatio, minWidth, padding, rowRef]);

  return width;
}
