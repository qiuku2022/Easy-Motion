import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import type { Keyframe, KeyframeSpringConfig } from "@/types/timeline";
import {
  DEFAULT_SPRING_CONFIG,
  sampleEasingCurve,
} from "@/lib/timeline/keyframeEasing";

interface SpringConfigEditorProps {
  value?: KeyframeSpringConfig;
  segmentFrames: number;
  fps: number;
  disabled?: boolean;
  onChange: (config: KeyframeSpringConfig) => void;
}

export function SpringConfigEditor({
  value,
  segmentFrames,
  fps,
  disabled,
  onChange,
}: SpringConfigEditorProps) {
  const config = { ...DEFAULT_SPRING_CONFIG, ...(value ?? {}) };

  const curve = useMemo(() => {
    const springConfig = { ...DEFAULT_SPRING_CONFIG, ...(value ?? {}) };
    const previewKf: Keyframe = {
      id: "preview",
      property: "preview",
      frame: segmentFrames,
      value: 1,
      easing: "spring",
      springConfig,
    };
    return sampleEasingCurve(previewKf, segmentFrames, fps, 32);
  }, [value, fps, segmentFrames]);

  const path = curve
    .map((p, i) => {
      const x = 8 + p.t * 184;
      const y = 56 - p.y * 48;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  const patch = (partial: Partial<KeyframeSpringConfig>) => {
    onChange({ ...config, ...partial });
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-muted-foreground">Spring 物理参数（预览使用 Remotion 同款 spring）</p>
      <svg width={200} height={64} className="rounded border border-border bg-muted/30">
        <path d={path} fill="none" stroke="#2dd4bf" strokeWidth={2} />
      </svg>
      <div className="grid grid-cols-3 gap-2">
        <Field
          label="阻尼"
          value={config.damping}
          disabled={disabled}
          onChange={(v) => patch({ damping: v })}
        />
        <Field
          label="刚度"
          value={config.stiffness}
          disabled={disabled}
          onChange={(v) => patch({ stiffness: v })}
        />
        <Field
          label="质量"
          value={config.mass ?? 1}
          disabled={disabled}
          onChange={(v) => patch({ mass: v })}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-0.5 block text-[10px] text-muted-foreground">{label}</label>
      <Input
        type="number"
        className="h-7 text-xs"
        disabled={disabled}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
    </div>
  );
}
