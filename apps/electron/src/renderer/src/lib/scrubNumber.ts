const SCRUB_THRESHOLD_PX = 3;

export function scrubStepSize(step: number, shift: boolean, alt: boolean): number {
  const factor = shift ? 0.1 : alt ? 10 : 1;
  return step * factor;
}

export function applyScrubDelta(
  startValue: number,
  dx: number,
  step: number,
  modifiers: { shift?: boolean; alt?: boolean },
): number {
  return startValue + dx * scrubStepSize(step, !!modifiers.shift, !!modifiers.alt);
}

export function clampScrubNumber(value: number, min?: number, max?: number): number {
  let next = value;
  if (min !== undefined) next = Math.max(min, next);
  if (max !== undefined) next = Math.min(max, next);
  return next;
}

export function formatScrubNumber(value: number, step = 1): string {
  if (!Number.isFinite(value)) return "0";
  if (step >= 1) return String(Math.round(value));
  const stepText = String(step);
  const decimals = stepText.includes(".") ? stepText.split(".")[1].length : 2;
  return value.toFixed(decimals);
}

export function parseScrubStartValue(raw: string): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export { SCRUB_THRESHOLD_PX };
