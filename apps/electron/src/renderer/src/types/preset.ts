export const PRESET_CATEGORIES = [
  "all",
  "background",
  "title",
  "data-chart",
  "intro-outro",
  "social-media",
  "content",
  "transition",
  "custom",
] as const;

export type PresetCategory = (typeof PRESET_CATEGORIES)[number];

export type PresetKind = "component" | "timeline";

export type PresetParameterType =
  | "text"
  | "number"
  | "color"
  | "select"
  | "image";

export interface PresetParameter {
  key: string;
  label: string;
  type: PresetParameterType;
  defaultValue: unknown;
  options?: { label: string; value: unknown }[];
  min?: number;
  max?: number;
  step?: number;
}

export interface PresetDefinition {
  id: string;
  name: string;
  description: string;
  category: Exclude<PresetCategory, "all">;
  kind: PresetKind;
  component?: string;
  modulePath?: string;
  durationInFrames: number;
  isBuiltin: boolean;
  thumbnail: string | null;
  parameters: PresetParameter[];
  license?: string;
  source?: string;
}

export interface PresetCategoryMeta {
  id: PresetCategory;
  label: string;
  icon: string;
}

export const PRESET_DRAG_MIME = "application/x-easymotion-preset";
