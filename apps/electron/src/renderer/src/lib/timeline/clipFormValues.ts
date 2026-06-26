import { z } from "zod";
import type { Clip } from "@/types/timeline";
import {
  getClipPropertyValue,
  getFieldsForClipType,
  ANIMATION_FIELDS,
  TRANSFORM_FIELDS,
  type ClipPropertyField,
} from "@/lib/timeline/clipPropertySchema";
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
): ClipFormValues {
  const values: ClipFormValues = {};
  for (const field of fields) {
    const raw = getClipPropertyValue(clip, field.path);
    values[field.path] =
      raw === undefined || raw === null
        ? field.type === "number"
          ? "0"
          : ""
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

export function parseFieldValue(
  field: ClipPropertyField,
  value: string,
): unknown | null {
  if (field.type === "number") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    let next = parsed;
    if (field.min !== undefined) next = Math.max(field.min, next);
    if (field.max !== undefined) next = Math.min(field.max, next);
    return next;
  }
  return value;
}
