import { useCallback, useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrubNumberInput } from "@/components/ui/scrub-number-input";
import { Textarea } from "@/components/ui/textarea";
import { ColorField } from "@/components/ui/color-field";
import type { Clip } from "@/types/timeline";
import type { ClipPatch } from "@/lib/timeline/mutations";
import {
  buildPresetPropsPatch,
  presetParameterToFieldType,
  resolvedClipPresetProps,
} from "@/lib/presetProps";
import type { PresetDefinition, PresetParameter } from "@/types/preset";

interface PresetParameterFieldsProps {
  clip: Clip;
  preset: PresetDefinition;
  disabled?: boolean;
  onPatch: (patch: ClipPatch) => void;
}

export function PresetParameterFields({
  clip,
  preset,
  disabled,
  onPatch,
}: PresetParameterFieldsProps) {
  const parameters = preset.parameters;
  const values = useMemo(
    () => resolvedClipPresetProps(clip, preset),
    [clip, preset],
  );

  const schema = useMemo(() => {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const param of parameters) {
      const fieldType = presetParameterToFieldType(param);
      if (fieldType === "number") {
        shape[param.key] = z
          .string()
          .refine((val) => val === "" || Number.isFinite(Number(val)), {
            message: "请输入有效数字",
          });
      } else {
        shape[param.key] = z.string();
      }
    }
    return z.object(shape);
  }, [parameters]);

  const form = useForm<Record<string, string>>({
    resolver: zodResolver(schema),
    defaultValues: Object.fromEntries(
      parameters.map((param) => [
        param.key,
        values[param.key] === undefined || values[param.key] === null
          ? ""
          : String(values[param.key]),
      ]),
    ),
    mode: "onBlur",
  });

  useEffect(() => {
    const nextValues = resolvedClipPresetProps(clip, preset);
    form.reset(
      Object.fromEntries(
        parameters.map((param) => [
          param.key,
          nextValues[param.key] === undefined || nextValues[param.key] === null
            ? ""
            : String(nextValues[param.key]),
        ]),
      ),
    );
    // 仅在切换片段/预设时重置，避免改色过程中表单被冲掉导致取色器关闭
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip.id, preset.id, form, parameters]);

  const commit = useCallback(
    async (param: PresetParameter) => {
      const valid = await form.trigger(param.key);
      if (!valid) return;

      const raw = form.getValues(param.key);
      const parsed =
        param.type === "number"
          ? raw === ""
            ? param.defaultValue
            : Number(raw)
          : raw;

      onPatch(buildPresetPropsPatch(clip, preset, param.key, parsed));
    },
    [clip, form, onPatch, preset],
  );

  return (
    <Form {...form}>
      <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
        {parameters.map((param) => {
          const fieldType = presetParameterToFieldType(param);
          return (
            <FormField
              key={param.key}
              control={form.control}
              name={param.key}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">{param.label}</FormLabel>
                  {fieldType === "color" ? (
                    <PresetColorField
                      param={param}
                      field={field}
                      disabled={disabled}
                      onCommit={commit}
                    />
                  ) : (
                    <FormControl>
                      {fieldType === "multiline" ? (
                        <Textarea
                          {...field}
                          disabled={disabled}
                          className="min-h-[88px] resize-y text-sm"
                          onBlur={() => {
                            field.onBlur();
                            void commit(param);
                          }}
                          onChange={(e) => field.onChange(e)}
                        />
                      ) : fieldType === "number" ? (
                        <ScrubNumberInput
                          {...field}
                          disabled={disabled}
                          className="h-8 text-xs"
                          min={param.min}
                          max={param.max}
                          step={param.step}
                          onCommit={() => {
                            void commit(param);
                          }}
                          onBlur={() => {
                            field.onBlur();
                            void commit(param);
                          }}
                        />
                      ) : (
                        <Input
                          {...field}
                          type={fieldType === "url" ? "url" : "text"}
                          disabled={disabled}
                          className="h-8 text-xs"
                          onBlur={() => {
                            field.onBlur();
                            void commit(param);
                          }}
                        />
                      )}
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          );
        })}
      </form>
    </Form>
  );
}

function PresetColorField({
  param,
  field,
  disabled,
  onCommit,
}: {
  param: PresetParameter;
  field: { value: string; onChange: (value: string) => void };
  disabled?: boolean;
  onCommit: (param: PresetParameter) => Promise<void>;
}) {
  const { formItemId } = useFormField();

  return (
    <ColorField
      id={formItemId}
      value={field.value || "#000000"}
      disabled={disabled}
      aria-label={`选择${param.label}`}
      onChange={field.onChange}
      onCommit={() => {
        void onCommit(param);
      }}
    />
  );
}
