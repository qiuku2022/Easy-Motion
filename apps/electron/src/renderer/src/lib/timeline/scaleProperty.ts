export const SCALE_PROPERTY_PATH = "transform.scale";

export function isScaleProperty(path: string): boolean {
  return path === SCALE_PROPERTY_PATH;
}

/** 内部倍数 → UI 百分比（100 = 原始大小，负值 = 翻转） */
export function scaleToPercent(value: number): number {
  if (!Number.isFinite(value)) return 100;
  return Math.round(value * 100);
}

/** UI 百分比 → 内部倍数 */
export function scaleFromPercent(percent: number): number {
  if (!Number.isFinite(percent)) return 1;
  return percent / 100;
}

/** 时间线内部存储倍数；允许负值翻转，不限制上限 */
export function clampScaleInternal(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return value;
}

export function formatScaleValue(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${scaleToPercent(value)}%`;
}

export function scaleInternalToFormValue(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "100";
  return String(scaleToPercent(value));
}
