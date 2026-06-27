import { BezierCurveEditor } from "@/components/properties/BezierCurveEditor";
import { SpringConfigEditor } from "@/components/properties/SpringConfigEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  VALID_KEYFRAME_EASING,
  VALID_KEYFRAME_INTERPOLATION,
} from "@/lib/timeline/keyframes";
import { DEFAULT_BEZIER_CP } from "@/lib/timeline/keyframeEasing";
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
            onValueChange={(v) =>
              onPatch({
                interpolation: v as KeyframeInterpolation,
                bezierCp:
                  v === "bezier" ? keyframe.bezierCp ?? DEFAULT_BEZIER_CP : keyframe.bezierCp,
              })
            }
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
            onValueChange={(v) => onPatch({ easing: v as KeyframeEasing })}
            disabled={disabled || keyframe.interpolation === "bezier"}
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

      {keyframe.interpolation === "bezier" && (
        <BezierCurveEditor
          value={keyframe.bezierCp}
          disabled={disabled}
          onChange={(bezierCp) => onPatch({ bezierCp, interpolation: "bezier" })}
        />
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
