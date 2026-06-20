/** Shared preset props helpers for vendored RVE components. */
export type RveBaseProps = {
  text?: string;
  title?: string;
  subtitle?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  value?: number;
  progress?: number;
  imageUrl?: string;
};

export function pText(
  props: RveBaseProps,
  key: keyof RveBaseProps,
  fallback: string,
): string {
  const v = props[key];
  return typeof v === "string" && v.trim().length > 0 ? v : fallback;
}

export function pColor(
  props: RveBaseProps,
  key: keyof RveBaseProps,
  fallback: string,
): string {
  const v = props[key];
  return typeof v === "string" && v.startsWith("#") ? v : fallback;
}

export function pNum(
  props: RveBaseProps,
  key: keyof RveBaseProps,
  fallback: number,
): number {
  const v = props[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function pCsv(
  props: RveBaseProps,
  key: keyof RveBaseProps,
  fallback: string[],
): string[] {
  const raw = pText(props, key, fallback.join(","));
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function pImage(
  props: RveBaseProps,
  key: keyof RveBaseProps,
  fallback: string,
): string {
  return pText(props, key, fallback);
}
