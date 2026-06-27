import { useCallback, useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { RotateCcw } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
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
import { KeyframeDiamondButton } from "@/components/properties/KeyframeDiamondButton";
import type { Clip } from "@/types/timeline";
import type { ClipPatch } from "@/lib/timeline/mutations";
import {
  buildPatchFromPropertyPath,
  getClipPropertyValue,
  type ClipPropertyField,
} from "@/lib/timeline/clipPropertySchema";
import {
  areClipPropertyValuesEqual,
  buildClipPropertyFormSchema,
  clipToFormValues,
  parseFieldValue,
  resolveClipPropertyFields,
  type ClipFormValues,
} from "@/lib/timeline/clipFormValues";
import {
  buildResetAllTransformPatch,
  buildResetTransformPropertyPatch,
  canResetAnyTransformProperty,
  canResetTransformProperty,
  getDefaultTransformPropertyValue,
} from "@/lib/timeline/transformReset";
import { getClipRelativeFrame, getPropertyValueAtFrame } from "@/lib/timeline/keyframes";
import {
  clipHasKeyframesForProperty,
  findKeyframeAtFrame,
  isAnimatableProperty,
} from "@/lib/timeline/keyframeProperty";
import { isOpacityProperty, opacityInternalToFormValue } from "@/lib/timeline/opacityProperty";
import { isScaleProperty, scaleInternalToFormValue } from "@/lib/timeline/scaleProperty";
import { isPositionProperty, positionInternalToFormValue } from "@/lib/timeline/positionProperty";
import type { TrackType } from "@/types/timeline";
import { cn } from "@/lib/utils";
import { useTimelineStore } from "@/stores/timelineStore";
import { useUiStore } from "@/stores/uiStore";

interface ClipPropertyFieldsProps {
  clipType: TrackType;
  clip: Clip;
  disabled?: boolean;
  onPatch: (patch: ClipPatch) => void;
  mode?: "quick" | "transform" | "animation" | "all";
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
    <ClipPropertyForm
      key={props.clip.id}
      {...props}
      fields={fields}
      showTransformReset={props.mode === "transform"}
    />
  );
}

function ClipPropertyForm({
  clip,
  fields,
  disabled,
  onPatch,
  showTransformReset = false,
}: ClipPropertyFieldsProps & {
  fields: ClipPropertyField[];
  showTransformReset?: boolean;
}) {
  const timeline = useTimelineStore((s) => s.timeline);
  const currentFrame = useTimelineStore((s) => s.currentFrame);
  const fps = useTimelineStore((s) => s.timeline?.fps ?? 30);
  const canvas = useMemo(
    () =>
      timeline
        ? { width: timeline.width, height: timeline.height }
        : undefined,
    [timeline],
  );
  const toggleKeyframeAtPlayhead = useTimelineStore((s) => s.toggleKeyframeAtPlayhead);
  const setPropertyValueAtPlayhead = useTimelineStore((s) => s.setPropertyValueAtPlayhead);
  const setSelectedProperty = useUiStore((s) => s.setSelectedKeyframeProperty);

  const relativeFrame = getClipRelativeFrame(currentFrame, clip);
  const keyframesRevision = (clip.keyframes ?? []).map((kf) => `${kf.id}:${kf.frame}:${String(kf.value)}`).join("|");

  const schema = useMemo(
    () => buildClipPropertyFormSchema(fields),
    [fields],
  );

  const form = useForm<ClipFormValues>({
    resolver: zodResolver(schema),
    defaultValues: clipToFormValues(clip, fields, { relativeFrame, fps }),
    mode: "onBlur",
  });

  useEffect(() => {
    form.reset(clipToFormValues(clip, fields, { relativeFrame, fps }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip.id, fields, form, relativeFrame, fps, keyframesRevision]);

  const commitField = useCallback(
    async (field: ClipPropertyField) => {
      const valid = await form.trigger(field.path);
      if (!valid) return;

      const value = form.getValues(field.path);
      const parsed = parseFieldValue(field, value);
      if (parsed === null) return;

      if (isAnimatableProperty(field.path)) {
        const currentValue = getPropertyValueAtFrame(
          clip,
          field.path,
          relativeFrame,
          fps,
        );
        if (areClipPropertyValuesEqual(field, parsed, currentValue)) return;
        setPropertyValueAtPlayhead(clip.id, field.path, parsed);
        return;
      }

      const currentValue = getClipPropertyValue(clip, field.path);
      if (areClipPropertyValuesEqual(field, parsed, currentValue)) return;
      onPatch(buildPatchFromPropertyPath(field.path, parsed));
    },
    [clip, fps, form, onPatch, relativeFrame, setPropertyValueAtPlayhead],
  );

  const handleDiamondClick = useCallback(
    async (field: ClipPropertyField) => {
      if (!isAnimatableProperty(field.path)) return;

      const valid = await form.trigger(field.path);
      if (!valid) return;

      const value = form.getValues(field.path);
      const parsed = parseFieldValue(field, value);
      if (parsed === null) return;

      const currentValue = getPropertyValueAtFrame(
        clip,
        field.path,
        relativeFrame,
        fps,
      );
      const valueChanged = !areClipPropertyValuesEqual(field, parsed, currentValue);
      const animated = clipHasKeyframesForProperty(clip, field.path);
      const atPlayhead = !!findKeyframeAtFrame(clip, field.path, relativeFrame);

      setSelectedProperty(field.path);

      if (valueChanged) {
        setPropertyValueAtPlayhead(clip.id, field.path, parsed);
        if (!animated && !atPlayhead) {
          toggleKeyframeAtPlayhead(clip.id, field.path);
        }
        return;
      }

      toggleKeyframeAtPlayhead(clip.id, field.path);
    },
    [
      clip,
      fps,
      form,
      relativeFrame,
      setPropertyValueAtPlayhead,
      setSelectedProperty,
      toggleKeyframeAtPlayhead,
    ],
  );

  const resetTransformField = useCallback(
    (field: ClipPropertyField) => {
      onPatch(buildResetTransformPropertyPatch(clip, field.path, canvas));
    },
    [canvas, clip, onPatch],
  );

  const resetAllTransform = useCallback(() => {
    onPatch(buildResetAllTransformPatch(clip, canvas));
  }, [canvas, clip, onPatch]);

  const canResetAll = showTransformReset && canResetAnyTransformProperty(clip, canvas);

  return (
    <Form {...form}>
      <form
        className="space-y-2"
        onSubmit={(e) => e.preventDefault()}
      >
        {showTransformReset ? (
          <div className="flex justify-end pb-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
              disabled={disabled || !canResetAll}
              title="将全部变换属性恢复为默认值，并清除相关关键帧"
              onClick={resetAllTransform}
            >
              <RotateCcw className="h-3 w-3" />
              全部重置
            </Button>
          </div>
        ) : null}
        {fields.map((field) => {
          const canReset =
            showTransformReset && canResetTransformProperty(clip, field.path, canvas);
          const animatable = isAnimatableProperty(field.path);
          const animated = animatable && clipHasKeyframesForProperty(clip, field.path);
          const atPlayhead =
            animatable && !!findKeyframeAtFrame(clip, field.path, relativeFrame);

          return (
            <FormField
              key={field.path}
              control={form.control}
              name={field.path}
              render={({ field: rf }) => (
                <FormItem
                  className={cn(
                    "grid items-center gap-2 space-y-0",
                    animatable
                      ? "grid-cols-[20px_88px_1fr]"
                      : "grid-cols-[88px_1fr]",
                    field.type === "multiline" && "items-start",
                  )}
                >
                  {animatable ? (
                    <KeyframeDiamondButton
                      atPlayhead={atPlayhead}
                      animated={animated && !atPlayhead}
                      disabled={disabled}
                      onClick={() => handleDiamondClick(field)}
                    />
                  ) : null}
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
                        clip={clip}
                        relativeFrame={relativeFrame}
                        rf={rf}
                        disabled={disabled}
                        onPatch={onPatch}
                        onValueCommit={(value) => {
                          if (isAnimatableProperty(field.path)) {
                            setPropertyValueAtPlayhead(clip.id, field.path, value);
                          } else {
                            onPatch(buildPatchFromPropertyPath(field.path, value));
                          }
                        }}
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
                                atPlayhead && "ring-1 ring-amber-400/40",
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
                            {showTransformReset ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 text-muted-foreground"
                                disabled={disabled || !canReset}
                                title={
                                  canReset
                                    ? `重置为默认值（${formatTransformResetHint(field.path, canvas)}）`
                                    : "已是默认值"
                                }
                                aria-label={`重置${field.label}`}
                                onClick={() => resetTransformField(field)}
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
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
          );
        })}
      </form>
    </Form>
  );
}

function ClipColorField({
  field,
  clip,
  relativeFrame,
  rf,
  disabled,
  onPatch,
  onValueCommit,
}: {
  field: ClipPropertyField;
  clip: Clip;
  relativeFrame: number;
  rf: { value: string; onChange: (value: string) => void };
  disabled?: boolean;
  onPatch: (patch: ClipPatch) => void;
  onValueCommit: (value: string) => void;
}) {
  const { formItemId } = useFormField();
  const atPlayhead = findKeyframeAtFrame(clip, field.path, relativeFrame);

  return (
    <ColorField
      id={formItemId}
      value={rf.value || "#000000"}
      disabled={disabled}
      aria-label={`选择${field.label}`}
      className={atPlayhead ? "ring-1 ring-amber-400/40 rounded-md" : undefined}
      onChange={rf.onChange}
      onCommit={(next) => {
        if (isAnimatableProperty(field.path)) {
          onValueCommit(next);
          return;
        }
        onPatch(buildPatchFromPropertyPath(field.path, next));
      }}
    />
  );
}

function formatTransformResetHint(
  path: string,
  canvas?: { width: number; height: number },
): string {
  const value = getDefaultTransformPropertyValue(path, canvas);
  if (path === "transform.opacity") {
    return `${opacityInternalToFormValue(value)}%`;
  }
  if (path === "transform.scale") {
    return `${scaleInternalToFormValue(value)}%`;
  }
  if (isPositionProperty(path)) {
    return String(positionInternalToFormValue(value));
  }
  if (path === "transform.rotation") {
    return `${value}°`;
  }
  return String(value);
}
