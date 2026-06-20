import { useCallback, useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "@/components/ui/form";
import { ColorField } from "@/components/ui/color-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Clip } from "@/types/timeline";
import type { ClipPatch } from "@/lib/timeline/mutations";
import {
  buildPatchFromPropertyPath,
  getClipPropertyValue,
  type ClipPropertyField,
} from "@/lib/timeline/clipPropertySchema";
import {
  buildClipPropertyFormSchema,
  clipToFormValues,
  parseFieldValue,
  resolveClipPropertyFields,
  type ClipFormValues,
} from "@/lib/timeline/clipFormValues";
import type { TrackType } from "@/types/timeline";
import { cn } from "@/lib/utils";

interface ClipPropertyFieldsProps {
  clipType: TrackType;
  clip: Clip;
  disabled?: boolean;
  onPatch: (patch: ClipPatch) => void;
  mode?: "quick" | "transform" | "all";
  excludePaths?: string[];
}

export function ClipPropertyFields(props: ClipPropertyFieldsProps) {
  const fields = useMemo(
    () =>
      resolveClipPropertyFields(
        props.clipType,
        props.mode ?? "quick",
        props.excludePaths ?? [],
      ),
    [props.clipType, props.mode, props.excludePaths],
  );

  if (fields.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        该类型暂无可编辑属性（参见代码生成规范 Layer Props）。
      </p>
    );
  }

  return (
    <ClipPropertyForm key={props.clip.id} {...props} fields={fields} />
  );
}

function ClipPropertyForm({
  clip,
  fields,
  disabled,
  onPatch,
}: ClipPropertyFieldsProps & { fields: ClipPropertyField[] }) {
  const schema = useMemo(
    () => buildClipPropertyFormSchema(fields),
    [fields],
  );

  const form = useForm<ClipFormValues>({
    resolver: zodResolver(schema),
    defaultValues: clipToFormValues(clip, fields),
    mode: "onBlur",
  });

  useEffect(() => {
    form.reset(clipToFormValues(clip, fields));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip.id, fields, form]);

  const commitField = useCallback(
    async (field: ClipPropertyField) => {
      const valid = await form.trigger(field.path);
      if (!valid) return;

      const value = form.getValues(field.path);
      const parsed = parseFieldValue(field, value);
      if (parsed === null) return;

      const raw = getClipPropertyValue(clip, field.path);
      const normalized =
        field.type === "number" ? Number(raw) : String(raw ?? "");
      const next =
        field.type === "number" ? parsed : String(parsed);

      if (next !== normalized) {
        onPatch(buildPatchFromPropertyPath(field.path, parsed));
      }
    },
    [clip, form, onPatch],
  );

  return (
    <Form {...form}>
      <form
        className="space-y-2"
        onSubmit={(e) => e.preventDefault()}
      >
        {fields.map((field) => (
          <FormField
            key={field.path}
            control={form.control}
            name={field.path}
            render={({ field: rf }) => (
              <FormItem
                className={cn(
                  "grid grid-cols-[88px_1fr] items-center gap-2 space-y-0",
                  field.type === "multiline" && "items-start",
                )}
              >
                <FormLabel className="text-xs font-normal text-muted-foreground">
                  {field.label}
                  {field.suffix && field.suffixOnLabel ? (
                    <span className="ml-0.5 text-muted-foreground/80">
                      {field.suffix}
                    </span>
                  ) : null}
                </FormLabel>
                <div className="space-y-1">
                  {field.type === "color" ? (
                    <ClipColorField
                      field={field}
                      rf={rf}
                      disabled={disabled}
                      onPatch={onPatch}
                    />
                  ) : (
                    <FormControl>
                      {field.type === "multiline" ? (
                        <Textarea
                          className="min-h-[72px] resize-y text-xs"
                          disabled={disabled}
                          {...rf}
                          onBlur={() => {
                            void rf.onBlur();
                            void commitField(field);
                          }}
                        />
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Input
                            type={field.type === "number" ? "number" : "text"}
                            className={cn(
                              "h-8 text-xs",
                              field.type === "number" ? "font-mono" : "font-sans",
                            )}
                            disabled={disabled}
                            min={field.min}
                            max={field.max}
                            step={field.step}
                            {...rf}
                            onBlur={() => {
                              void rf.onBlur();
                              void commitField(field);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void commitField(field);
                              }
                            }}
                          />
                          {field.suffix && !field.suffixOnLabel ? (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {field.suffix}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </FormControl>
                  )}
                  <FormMessage className="text-xs" />
                </div>
              </FormItem>
            )}
          />
        ))}
      </form>
    </Form>
  );
}

function ClipColorField({
  field,
  rf,
  disabled,
  onPatch,
}: {
  field: ClipPropertyField;
  rf: { value: string; onChange: (value: string) => void };
  disabled?: boolean;
  onPatch: (patch: ClipPatch) => void;
}) {
  const { formItemId } = useFormField();

  return (
    <ColorField
      id={formItemId}
      value={rf.value || "#000000"}
      disabled={disabled}
      aria-label={`选择${field.label}`}
      onChange={rf.onChange}
      onCommit={(next) => onPatch(buildPatchFromPropertyPath(field.path, next))}
    />
  );
}
