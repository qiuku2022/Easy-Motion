import { useMemo, useState } from "react";
import { Diamond, Plus, Trash2 } from "lucide-react";
import { BezierCurveEditor } from "@/components/properties/BezierCurveEditor";
import { SpringConfigEditor } from "@/components/properties/SpringConfigEditor";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  KEYFRAME_ANIMATABLE_PROPERTIES,
  VALID_KEYFRAME_EASING,
  VALID_KEYFRAME_INTERPOLATION,
  getClipRelativeFrame,
  getPropertyValueAtFrame,
} from "@/lib/timeline/keyframes";
import { DEFAULT_BEZIER_CP } from "@/lib/timeline/keyframeEasing";
import { cn } from "@/lib/utils";
import { useTimelineStore } from "@/stores/timelineStore";
import { useUiStore } from "@/stores/uiStore";
import type { Clip, Keyframe, KeyframeEasing, KeyframeInterpolation } from "@/types/timeline";

interface KeyframeEditorProps {
  clip: Clip;
  disabled?: boolean;
}

export function KeyframeEditor({ clip, disabled }: KeyframeEditorProps) {
  const timeline = useTimelineStore((s) => s.timeline);
  const currentFrame = useTimelineStore((s) => s.currentFrame);
  const addKeyframeAtPlayhead = useTimelineStore((s) => s.addKeyframeAtPlayhead);
  const removeKeyframe = useTimelineStore((s) => s.removeKeyframe);
  const updateKeyframe = useTimelineStore((s) => s.updateKeyframe);
  const selectedProperty = useUiStore((s) => s.selectedKeyframeProperty);
  const setSelectedProperty = useUiStore((s) => s.setSelectedKeyframeProperty);
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null);

  const fps = timeline?.fps ?? 30;
  const relativeFrame = getClipRelativeFrame(currentFrame, clip);
  const keyframes = (clip.keyframes ?? []) as Keyframe[];

  const propertyKeyframes = useMemo(
    () =>
      keyframes
        .filter((kf) => kf.property === selectedProperty)
        .sort((a, b) => a.frame - b.frame),
    [keyframes, selectedProperty],
  );

  const selectedKeyframe = propertyKeyframes.find((kf) => kf.id === selectedKeyframeId);
  const selectedIndex = selectedKeyframe
    ? propertyKeyframes.findIndex((kf) => kf.id === selectedKeyframe.id)
    : -1;
  const prevKeyframe = selectedIndex > 0 ? propertyKeyframes[selectedIndex - 1] : null;
  const segmentFrames =
    selectedKeyframe && prevKeyframe
      ? selectedKeyframe.frame - prevKeyframe.frame
      : clip.durationInFrames;

  const currentValue = selectedProperty
    ? getPropertyValueAtFrame(clip, selectedProperty, relativeFrame, fps)
    : null;

  const propertyLabel =
    KEYFRAME_ANIMATABLE_PROPERTIES.find((p) => p.path === selectedProperty)
      ?.label ?? selectedProperty;

  const patchSelected = (patch: Partial<Keyframe>) => {
    if (!selectedKeyframe) return;
    updateKeyframe(clip.id, selectedKeyframe.id, patch);
  };

  return (
    <section className="space-y-2 rounded-md border border-border bg-card/40 p-2.5">
      <div className="flex items-center gap-2">
        <Diamond className="h-3.5 w-3.5 text-amber-400" />
        <h3 className="text-xs font-medium text-foreground">关键帧</h3>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[8rem] flex-1">
          <label className="mb-1 block text-[10px] text-muted-foreground">动画属性</label>
          <Select
            value={selectedProperty ?? undefined}
            onValueChange={(v) => {
              setSelectedProperty(v);
              setSelectedKeyframeId(null);
            }}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="选择属性" />
            </SelectTrigger>
            <SelectContent>
              {KEYFRAME_ANIMATABLE_PROPERTIES.map((item) => (
                <SelectItem key={item.path} value={item.path} className="text-xs">
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-xs"
          disabled={disabled || !selectedProperty}
          onClick={() => {
            if (!selectedProperty) return;
            addKeyframeAtPlayhead(clip.id, selectedProperty, currentValue);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          在第 {relativeFrame} 帧添加
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground">
        当前值：{formatKeyframeValue(currentValue)} · 片段相对帧 {relativeFrame}
      </p>

      {propertyKeyframes.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">
          「{propertyLabel}」暂无关键帧。将播放头移到目标位置后点击添加。
        </p>
      ) : (
        <ul className="space-y-1">
          {propertyKeyframes.map((kf) => (
            <li
              key={kf.id}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-2 rounded border px-2 py-1 text-[11px]",
                selectedKeyframeId === kf.id
                  ? "border-primary/50 bg-primary/10"
                  : "border-border/70 bg-background/60",
              )}
              onClick={() => setSelectedKeyframeId(kf.id)}
            >
              <span className="font-mono text-foreground">
                f{kf.frame} = {formatKeyframeValue(kf.value)}
              </span>
              <span className="text-muted-foreground">
                {kf.interpolation ?? "linear"}
                {kf.easing === "spring" ? " · spring" : kf.easing ? ` · ${kf.easing}` : ""}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                disabled={disabled}
                aria-label="删除关键帧"
                onClick={(e) => {
                  e.stopPropagation();
                  removeKeyframe(clip.id, kf.id);
                  if (selectedKeyframeId === kf.id) setSelectedKeyframeId(null);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {selectedKeyframe && selectedIndex > 0 && (
        <div className="space-y-2 border-t border-border pt-2">
          <p className="text-[10px] font-medium text-foreground">
            片段 f{prevKeyframe!.frame} → f{selectedKeyframe.frame} 的缓动
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] text-muted-foreground">插值</label>
              <Select
                value={selectedKeyframe.interpolation ?? "linear"}
                onValueChange={(v) =>
                  patchSelected({
                    interpolation: v as KeyframeInterpolation,
                    bezierCp:
                      v === "bezier"
                        ? selectedKeyframe.bezierCp ?? DEFAULT_BEZIER_CP
                        : selectedKeyframe.bezierCp,
                  })
                }
                disabled={disabled}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALID_KEYFRAME_INTERPOLATION.map((item) => (
                    <SelectItem key={item} value={item} className="text-xs">
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-muted-foreground">缓动</label>
              <Select
                value={selectedKeyframe.easing ?? "ease-in-out"}
                onValueChange={(v) =>
                  patchSelected({ easing: v as KeyframeEasing })
                }
                disabled={disabled || selectedKeyframe.interpolation === "bezier"}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALID_KEYFRAME_EASING.map((item) => (
                    <SelectItem key={item} value={item} className="text-xs">
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedKeyframe.interpolation === "bezier" && (
            <BezierCurveEditor
              value={selectedKeyframe.bezierCp}
              disabled={disabled}
              onChange={(bezierCp) => patchSelected({ bezierCp, interpolation: "bezier" })}
            />
          )}

          {selectedKeyframe.easing === "spring" && (
            <SpringConfigEditor
              value={selectedKeyframe.springConfig}
              segmentFrames={segmentFrames}
              fps={fps}
              disabled={disabled}
              onChange={(springConfig) =>
                patchSelected({ springConfig, easing: "spring" })
              }
            />
          )}
        </div>
      )}
    </section>
  );
}

function formatKeyframeValue(value: unknown): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  if (typeof value === "string") return value;
  return "—";
}
