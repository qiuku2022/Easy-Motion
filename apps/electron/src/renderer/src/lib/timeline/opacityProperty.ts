export const OPACITY_PROPERTY_PATH = "transform.opacity";

export function isOpacityProperty(path: string): boolean {
  return path === OPACITY_PROPERTY_PATH;
}

/** 内部 0–1 → UI 0–100（0 透明，100 不透明） */
export function opacityToPercent(value: number): number {
  if (!Number.isFinite(value)) return 100;
  return Math.round(Math.min(100, Math.max(0, value * 100)));
}

/** UI 0–100 → 内部 0–1 */
export function opacityFromPercent(percent: number): number {
  if (!Number.isFinite(percent)) return 1;
  const clamped = Math.min(100, Math.max(0, percent));
  return clamped / 100;
}

/** 时间线内部存储 0–1 */
export function clampOpacityInternal(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

export function formatOpacityValue(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${opacityToPercent(value)}%`;
}

export function opacityInternalToFormValue(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "100";
  return String(opacityToPercent(value));
}
