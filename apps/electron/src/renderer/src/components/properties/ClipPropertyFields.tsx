import { useCallback, useEffect, useState } from "react";
import type { Clip } from "@/types/timeline";
import type { ClipPatch } from "@/lib/timeline/mutations";
import {
  buildPatchFromPropertyPath,
  getClipPropertyValue,
  getFieldsForClipType,
  TRANSFORM_FIELDS,
  type ClipPropertyField,
} from "@/lib/timeline/clipPropertySchema";
import type { TrackType } from "@/types/timeline";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-md border border-em-border bg-em-surface px-2.5 py-1.5 font-mono text-xs text-em-text placeholder:text-em-muted focus:border-em-teal focus:outline-none focus:ring-1 focus:ring-em-teal disabled:cursor-not-allowed disabled:opacity-50";

function PropertyRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-[88px_1fr] items-center gap-2", className)}>
      <span className="text-xs text-em-muted">{label}</span>
      {children}
    </div>
  );
}

function SchemaField({
  field,
  clip,
  disabled,
  onPatch,
}: {
  field: ClipPropertyField;
  clip: Clip;
  disabled?: boolean;
  onPatch: (patch: ClipPatch) => void;
}) {
  const raw = getClipPropertyValue(clip, field.path);
  const displayValue =
    raw === undefined || raw === null ? (field.type === "number" ? "0" : "") : String(raw);

  const [draft, setDraft] = useState(displayValue);

  useEffect(() => {
    setDraft(displayValue);
  }, [displayValue, clip.id, field.path]);

  const commit = useCallback(() => {
    if (field.type === "number") {
      const parsed = Number(draft);
      if (!Number.isFinite(parsed)) {
        setDraft(displayValue);
        return;
      }
      let next = parsed;
      if (field.min !== undefined) next = Math.max(field.min, next);
      if (field.max !== undefined) next = Math.min(field.max, next);
      if (next !== Number(raw)) {
        onPatch(buildPatchFromPropertyPath(field.path, next));
      }
      return;
    }
    if (draft !== displayValue) {
      onPatch(buildPatchFromPropertyPath(field.path, draft));
    }
  }, [draft, displayValue, field, onPatch, raw]);

  if (field.type === "multiline") {
    return (
      <PropertyRow label={field.label} className="items-start">
        <textarea
          className={cn(inputClass, "min-h-[72px] resize-y font-sans")}
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
        />
      </PropertyRow>
    );
  }

  return (
    <PropertyRow label={field.label}>
      <div className="flex items-center gap-1.5">
        <input
          type={field.type === "number" ? "number" : "text"}
          className={cn(inputClass, field.type !== "number" && "font-sans")}
          value={draft}
          disabled={disabled}
          min={field.min}
          max={field.max}
          step={field.step}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && field.type !== "multiline") {
              e.preventDefault();
              commit();
            }
          }}
        />
        {field.suffix ? (
          <span className="shrink-0 text-xs text-em-muted">{field.suffix}</span>
        ) : null}
      </div>
    </PropertyRow>
  );
}

export function ClipPropertyFields({
  clipType,
  clip,
  disabled,
  onPatch,
  mode = "quick",
  excludePaths = [],
}: {
  clipType: TrackType;
  clip: Clip;
  disabled?: boolean;
  onPatch: (patch: ClipPatch) => void;
  mode?: "quick" | "transform" | "all";
  excludePaths?: string[];
}) {
  const excluded = new Set(excludePaths);
  const contentFields = getFieldsForClipType(clipType).filter(
    (f) => !excluded.has(f.path),
  );
  const fields =
    mode === "quick"
      ? contentFields.filter((f) => f.quick)
      : mode === "transform"
        ? TRANSFORM_FIELDS
        : [...contentFields, ...TRANSFORM_FIELDS.filter((t) => !contentFields.some((c) => c.path === t.path))];

  if (fields.length === 0) {
    return (
      <p className="text-xs text-em-muted">
        该类型暂无可编辑属性（参见代码生成规范 Layer Props）。
      </p>
    );
  }

  return (
    <>
      {fields.map((field) => (
        <SchemaField
          key={field.path}
          field={field}
          clip={clip}
          disabled={disabled}
          onPatch={onPatch}
        />
      ))}
    </>
  );
}
