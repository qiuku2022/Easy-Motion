import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrubNumberInput } from "@/components/ui/scrub-number-input";
import {
  buildEntranceAnimationPatch,
  clampEntranceAnimationDuration,
  ENTRANCE_ANIMATION_PRESETS,
  getEntranceAnimationDuration,
  getEntranceAnimationPreset,
  type EntranceAnimationPresetId,
} from "@/lib/timeline/entranceAnimationPresets";
import type { Clip } from "@/types/timeline";
import type { ClipPatch } from "@/lib/timeline/mutations";
import { useTimelineStore } from "@/stores/timelineStore";

interface EntranceAnimationFieldsProps {
  clip: Clip;
  disabled?: boolean;
  onPatch: (patch: ClipPatch) => void;
}

export function EntranceAnimationFields({
  clip,
  disabled,
  onPatch,
}: EntranceAnimationFieldsProps) {
  const timeline = useTimelineStore((s) => s.timeline);
  const canvas = useMemo(
    () => ({
      width: timeline?.width ?? 1920,
      height: timeline?.height ?? 1080,
    }),
    [timeline?.height, timeline?.width],
  );

  const selectedPreset = getEntranceAnimationPreset(clip);
  const selectedMeta = ENTRANCE_ANIMATION_PRESETS.find(
    (preset) => preset.id === selectedPreset,
  );
  const duration = clampEntranceAnimationDuration(
    clip,
    getEntranceAnimationDuration(clip),
  );
  const [durationValue, setDurationValue] = useState(String(duration));

  useEffect(() => {
    setDurationValue(String(duration));
  }, [clip.id, duration]);

  const applyPreset = (
    presetId: EntranceAnimationPresetId,
    rawDuration = durationValue,
  ) => {
    const parsed = Number(rawDuration);
    const nextDuration = clampEntranceAnimationDuration(clip, parsed);
    setDurationValue(String(nextDuration));
    onPatch(buildEntranceAnimationPatch(clip, presetId, nextDuration, canvas));
  };

  const commitDuration = () => {
    applyPreset(selectedPreset);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[88px_1fr] items-center gap-2">
        <label className="text-xs font-normal text-muted-foreground">
          入场预设
        </label>
        <Select
          value={selectedPreset}
          onValueChange={(value) =>
            applyPreset(value as EntranceAnimationPresetId)
          }
          disabled={disabled}
        >
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue placeholder="选择入场预设" />
          </SelectTrigger>
          <SelectContent>
            {ENTRANCE_ANIMATION_PRESETS.map((preset) => (
              <SelectItem key={preset.id} value={preset.id} className="text-xs">
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-[88px_1fr] items-center gap-2">
        <label className="text-xs font-normal text-muted-foreground">
          入场时长
          <span className="ml-0.5 text-muted-foreground/80">f</span>
        </label>
        <ScrubNumberInput
          className="h-8 text-xs"
          disabled={disabled}
          min={1}
          max={Math.max(1, clip.durationInFrames - 1)}
          step={1}
          value={durationValue}
          onChange={setDurationValue}
          onScrub={(next) => applyPreset(selectedPreset, next)}
          onCommit={commitDuration}
          onBlur={commitDuration}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDuration();
            }
          }}
        />
      </div>

      <p className="text-[10px] leading-4 text-muted-foreground">
        {selectedMeta?.description ?? "选择一个预设后会生成可编辑关键帧。"}
      </p>
    </div>
  );
}

