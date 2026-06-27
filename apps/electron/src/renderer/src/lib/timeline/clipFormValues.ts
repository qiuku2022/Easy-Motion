import { z } from "zod";
import type { Clip } from "@/types/timeline";
import {
  getClipPropertyValue,
  getFieldsForClipType,
  ANIMATION_FIELDS,
  TRANSFORM_FIELDS,
  type ClipPropertyField,
} from "@/lib/timeline/clipPropertySchema";
import { getPropertyValueAtFrame } from "@/lib/timeline/keyframes";
import { isAnimatableProperty } from "@/lib/timeline/keyframeProperty";
import {
  isOpacityProperty,
  opacityFromPercent,
  opacityInternalToFormValue,
} from "@/lib/timeline/opacityProperty";
import {
  isScaleProperty,
  scaleFromPercent,
  scaleInternalToFormValue,
} from "@/lib/timeline/scaleProperty";
import {
  isPositionProperty,
  positionInternalToFormValue,
  snapPositionValue,
} from "@/lib/timeline/positionProperty";
import type { TrackType } from "@/types/timeline";

export type ClipFormValues = Record<string, string>;

export function resolveClipPropertyFields(
  clipType: TrackType,
  mode: "quick" | "transform" | "animation" | "all",
  excludePaths: string[] = [],
): ClipPropertyField[] {
  const excluded = new Set(excludePaths);
  const contentFields = getFieldsForClipType(clipType).filter(
    (f) => !excluded.has(f.path),
  );
  if (mode === "quick") {
    return contentFields.filter((f) => f.quick);
  }
  if (mode === "transform") {
    return TRANSFORM_FIELDS;
  }
  if (mode === "animation") {
    return ANIMATION_FIELDS;
  }
  return [
    ...contentFields,
    ...TRANSFORM_FIELDS.filter(
      (t) => !contentFields.some((c) => c.path === t.path),
    ),
  ];
}

export function clipToFormValues(
  clip: Clip,
  fields: ClipPropertyField[],
  options?: { relativeFrame?: number; fps?: number },
): ClipFormValues {
  const relativeFrame = options?.relativeFrame;
  const fps = options?.fps ?? 30;
  const values: ClipFormValues = {};
  for (const field of fields) {
    const raw =
      relativeFrame !== undefined && isAnimatableProperty(field.path)
        ? getPropertyValueAtFrame(clip, field.path, relativeFrame, fps)
        : getClipPropertyValue(clip, field.path);
    values[field.path] =
      raw === undefined || raw === null
        ? field.type === "number"
          ? isOpacityProperty(field.path)
            ? "100"
            : isScaleProperty(field.path)
              ? "100"
              : "0"
          : ""
        : isOpacityProperty(field.path)
          ? opacityInternalToFormValue(raw)
          : isScaleProperty(field.path)
            ? scaleInternalToFormValue(raw)
            : isPositionProperty(field.path)
              ? positionInternalToFormValue(raw)
              : String(raw);
  }
  return values;
}

function zodFieldSchema(field: ClipPropertyField): z.ZodString {
  if (field.type !== "number") {
    return z.string();
  }
  return z
    .string()
    .refine(
      (val) => val === "" || Number.isFinite(Number(val)),
      { message: "请输入有效数字" },
    )
    .refine(
      (val) => {
        if (val === "") return true;
        const n = Number(val);
        if (isScaleProperty(field.path)) return true;
        if (field.min !== undefined && n < field.min) return false;
        if (field.max !== undefined && n > field.max) return false;
        return true;
      },
      {
        message:
          field.min !== undefined && field.max !== undefined
            ? `范围 ${field.min}–${field.max}`
            : field.min !== undefined
              ? `不能小于 ${field.min}`
              : `不能大于 ${field.max}`,
      },
    );
}

export function buildClipPropertyFormSchema(fields: ClipPropertyField[]) {
  const shape: Record<string, z.ZodString> = {};
  for (const field of fields) {
    shape[field.path] = zodFieldSchema(field);
  }
  return z.object(shape);
}

export function areClipPropertyValuesEqual(
  field: ClipPropertyField,
  a: unknown,
  b: unknown,
): boolean {
  if (isOpacityProperty(field.path)) {
    return (
      typeof a === "number" &&
      typeof b === "number" &&
      opacityInternalToFormValue(a) === opacityInternalToFormValue(b)
    );
  }
  if (isScaleProperty(field.path)) {
    return (
      typeof a === "number" &&
      typeof b === "number" &&
      scaleInternalToFormValue(a) === scaleInternalToFormValue(b)
    );
  }
  if (isPositionProperty(field.path)) {
    return (
      typeof a === "number" &&
      typeof b === "number" &&
      positionInternalToFormValue(a) === positionInternalToFormValue(b)
    );
  }
  if (field.type === "number") {
    return Number(a) === Number(b);
  }
  return String(a) === String(b ?? "");
}

export function parseFieldValue(
  field: ClipPropertyField,
  value: string,
): unknown | null {
  if (field.type === "number") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    if (isOpacityProperty(field.path)) {
      return opacityFromPercent(parsed);
    }
    if (isScaleProperty(field.path)) {
      return scaleFromPercent(parsed);
    }
    if (isPositionProperty(field.path)) {
      return snapPositionValue(parsed);
    }
    let next = parsed;
    if (field.min !== undefined) next = Math.max(field.min, next);
    if (field.max !== undefined) next = Math.min(field.max, next);
    return next;
  }
  return value;
}
