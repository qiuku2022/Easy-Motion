import type { Clip } from "@/types/timeline";
import type { ClipPatch } from "@/lib/timeline/mutations";
import type { PresetDefinition, PresetParameter } from "@/types/preset";

export function defaultPropsFromPreset(
  preset: PresetDefinition,
): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const param of preset.parameters) {
    props[param.key] = param.defaultValue;
  }
  return props;
}

export function resolvedClipPresetProps(
  clip: Clip,
  preset: PresetDefinition,
): Record<string, unknown> {
  const stored =
    clip.source?.props && typeof clip.source.props === "object"
      ? (clip.source.props as Record<string, unknown>)
      : {};
  return { ...defaultPropsFromPreset(preset), ...stored };
}

export function buildPresetPropsPatch(
  clip: Clip,
  preset: PresetDefinition,
  key: string,
  value: unknown,
): ClipPatch {
  const props = { ...resolvedClipPresetProps(clip, preset), [key]: value };
  return {
    source: {
      props,
    },
  };
}

export function isPresetPropsOnlyPatch(patch: ClipPatch): boolean {
  const keys = Object.keys(patch);
  if (keys.length !== 1 || keys[0] !== "source") return false;
  const source = patch.source;
  if (!source || typeof source !== "object") return false;
  const sourceKeys = Object.keys(source);
  return sourceKeys.length === 1 && sourceKeys[0] === "props";
}
export function presetParameterToFieldType(
  param: PresetParameter,
): "text" | "multiline" | "number" | "color" | "url" {
  if (param.type === "number") return "number";
  if (param.type === "color") return "color";
  if (param.type === "image") return "url";
  if (param.key === "text" || param.type === "text") return "multiline";
  return "text";
}
