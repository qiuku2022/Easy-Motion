import { useEffect, useRef, useState } from "react";
import {
  Code2,
  FileInput,
  MoreHorizontal,
  RefreshCw,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AddTrackMenu } from "@/components/timeline/AddTrackMenu";
import { useTimelineStore } from "@/stores/timelineStore";

interface TimelineDevMenuProps {
  disabled?: boolean;
}

export function TimelineDevMenu({ disabled }: TimelineDevMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const isLoading = useTimelineStore((s) => s.isLoading);
  const isGenerating = useTimelineStore((s) => s.isGenerating);
  const isSaving = useTimelineStore((s) => s.isSaving);
  const isSyncingRemotion = useTimelineStore((s) => s.isSyncingRemotion);
  const timeline = useTimelineStore((s) => s.timeline);
  const remotionDrift = useTimelineStore((s) => s.remotionDrift);
  const loadTimeline = useTimelineStore((s) => s.loadTimeline);
  const applySampleTimeline = useTimelineStore((s) => s.applySampleTimeline);
  const runGenerate = useTimelineStore((s) => s.runGenerate);
  const syncFromRemotion = useTimelineStore((s) => s.syncFromRemotion);
  const clearError = useTimelineStore((s) => s.clearError);

  const busy = disabled || isLoading || isGenerating || isSaving;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const run = (fn: () => void | Promise<void>) => {
    clearError();
    void fn();
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative flex items-center gap-2">
      <AddTrackMenu disabled={busy || !timeline} />

      <button
        type="button"
        title="更多时间线操作"
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "cursor-pointer rounded-sm p-1.5 text-em-muted transition-colors duration-150 ease-out hover:bg-em-elevated hover:text-em-text disabled:cursor-not-allowed disabled:opacity-50",
          open && "bg-em-elevated text-em-text",
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] rounded-md border border-em-border bg-em-elevated py-1 shadow-lg"
        >
          <MenuItem
            icon={
              <FileInput
                className={cn("h-3.5 w-3.5", isSyncingRemotion && "animate-pulse")}
              />
            }
            label={isSyncingRemotion ? "读取中…" : "从 Remotion 读取"}
            disabled={busy}
            onClick={() => run(syncFromRemotion)}
          />
          <MenuItem
            icon={
              <RefreshCw
                className={cn(
                  "h-3.5 w-3.5",
                  isLoading && !isSyncingRemotion && "animate-spin",
                )}
              />
            }
            label="加载时间线"
            disabled={busy}
            onClick={() => run(loadTimeline)}
          />
          <MenuItem
            icon={<Wand2 className="h-3.5 w-3.5" />}
            label="写入示例"
            disabled={busy}
            onClick={() => run(applySampleTimeline)}
          />
          <MenuItem
            icon={<Code2 className="h-3.5 w-3.5" />}
            label={isGenerating ? "生成中…" : "生成预览"}
            disabled={busy || !timeline}
            hint={
              remotionDrift?.hasCustomRemotionCode
                ? "将覆盖 MainSequence"
                : undefined
            }
            onClick={() => run(() => runGenerate({ manual: true }))}
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-xs text-em-text transition-colors duration-100 ease-out hover:bg-em-surface disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      <span className="flex-1">{label}</span>
      {hint && <span className="text-[10px] text-amber-200/80">{hint}</span>}
    </button>
  );
}
