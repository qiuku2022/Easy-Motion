export const POSITION_X_PATH = "transform.position.x";
export const POSITION_Y_PATH = "transform.position.y";

/** 时间线坐标：左下角 (0,0)，X→右、Y→上；值为图层中心锚点坐标 */

export function isPositionProperty(path: string): boolean {
  return path === POSITION_X_PATH || path === POSITION_Y_PATH;
}

export function snapPositionValue(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.round(value);
}

export function formatPositionValue(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return String(Math.round(value));
}

export function positionInternalToFormValue(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0";
  return String(Math.round(value));
}

export function normalizeKeyframePropertyValue(
  property: string,
  value: unknown,
): unknown {
  if (!isPositionProperty(property)) return value;
  return snapPositionValue(value);
}
