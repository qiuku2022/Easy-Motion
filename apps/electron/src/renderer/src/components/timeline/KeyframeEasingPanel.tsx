import { SpringConfigEditor } from "@/components/properties/SpringConfigEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bezierCpToTemporalEases, easyEaseBezierCp } from "@/lib/timeline/graph-editor/temporalEase";
import { easingKeyframePatch } from "@/lib/timeline/graph-editor/easingKeyframePatch";
import {
  VALID_KEYFRAME_EASING,
  VALID_KEYFRAME_INTERPOLATION,
} from "@/lib/timeline/keyframes";
import type { Keyframe, KeyframeEasing, KeyframeInterpolation } from "@/types/timeline";

interface KeyframeEasingPanelProps {
  keyframe: Keyframe;
  prevKeyframe: Keyframe | null;
  fps: number;
  disabled?: boolean;
  onPatch: (patch: Partial<Keyframe>) => void;
}

export function KeyframeEasingPanel({
  keyframe,
  prevKeyframe,
  fps,
  disabled,
  onPatch,
}: KeyframeEasingPanelProps) {
  if (!prevKeyframe) {
    return (
      <p className="text-xs leading-snug text-foreground/70">
        首个关键帧无入缓动；选中后续关键帧可编辑片段缓动。
      </p>
    );
  }

  const segmentFrames = keyframe.frame - prevKeyframe.frame;
  const temporal =
    keyframe.interpolation === "bezier"
      ? bezierCpToTemporalEases(prevKeyframe, keyframe, fps)
      : null;

  return (
    <div className="mt-1.5 space-y-1.5 rounded border border-border/60 bg-background/50 p-1.5">
      <p className="text-xs font-medium text-foreground">
        f{prevKeyframe.frame} → f{keyframe.frame} 缓动
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <label className="mb-0.5 block text-xs text-foreground/70">插值</label>
          <Select
            value={keyframe.interpolation ?? "linear"}
            onValueChange={(v) => {
              const interpolation = v as KeyframeInterpolation;
              if (interpolation === "bezier") {
                onPatch({
                  interpolation: "bezier",
                  bezierCp:
                    keyframe.bezierCp ??
                    easyEaseBezierCp(prevKeyframe, keyframe, fps),
                });
                return;
              }
              onPatch({ interpolation });
            }}
            disabled={disabled}
          >
            <SelectTrigger className="h-7 text-xs">
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
          <label className="mb-0.5 block text-xs text-foreground/70">缓动</label>
          <Select
            value={keyframe.easing ?? "ease-in-out"}
            onValueChange={(v) =>
              onPatch(
                easingKeyframePatch(v as KeyframeEasing, prevKeyframe, keyframe, fps),
              )
            }
            disabled={disabled}
          >
            <SelectTrigger className="h-7 text-xs">
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

      {keyframe.interpolation !== "bezier" &&
        keyframe.easing &&
        keyframe.easing !== "linear" &&
        keyframe.easing !== "spring" && (
          <p className="text-[10px] leading-snug text-amber-600/90 dark:text-amber-400/90">
            当前为线性插值 + 多项式缓动，速度图呈折线三角。请选 bezier 插值或 Easy Ease 以获得平滑曲线。
          </p>
        )}

      {keyframe.interpolation === "bezier" && temporal && (
        <p className="font-mono text-[10px] text-muted-foreground">
          段尾入速 {temporal.incoming.speed.toFixed(2)}/s · 影响{" "}
          {temporal.incoming.influence.toFixed(1)}% · 段首出速{" "}
          {temporal.outgoing.speed.toFixed(2)}/s · 影响{" "}
          {temporal.outgoing.influence.toFixed(1)}% · 在上方速度图/值图拖手柄编辑
        </p>
      )}

      {keyframe.easing === "spring" && (
        <SpringConfigEditor
          value={keyframe.springConfig}
          segmentFrames={segmentFrames}
          fps={fps}
          disabled={disabled}
          onChange={(springConfig) => onPatch({ springConfig, easing: "spring" })}
        />
      )}
    </div>
  );
}
