import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ADD_TRACK_TYPES,
  defaultTrackName,
  TRACK_TYPE_LABELS,
} from "@/lib/timeline/trackLabels";
import { useTimelineStore } from "@/stores/timelineStore";

interface AddTrackMenuProps {
  disabled?: boolean;
}

export function AddTrackMenu({ disabled }: AddTrackMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const addTrack = useTimelineStore((s) => s.addTrack);
  const clearError = useTimelineStore((s) => s.clearError);

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

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title="添加轨道"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 rounded-sm border border-em-border bg-em-elevated px-2 py-1 text-xs text-em-text transition-colors duration-150 ease-out hover:bg-em-surface disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-em-teal/50 bg-em-teal/10",
        )}
      >
        <Plus className="h-3.5 w-3.5" />
        轨道
        <ChevronDown className={cn("h-3 w-3 text-em-muted", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 min-w-[9rem] rounded-md border border-em-border bg-em-elevated py-1 shadow-lg"
        >
          {ADD_TRACK_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              role="menuitem"
              className="flex w-full cursor-pointer px-3 py-1.5 text-left text-xs text-em-text transition-colors duration-100 ease-out hover:bg-em-surface"
              onClick={() => {
                clearError();
                addTrack(type, defaultTrackName(type));
                setOpen(false);
              }}
            >
              {TRACK_TYPE_LABELS[type]}
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            className="flex w-full cursor-pointer border-t border-em-border px-3 py-1.5 text-left text-xs text-em-text transition-colors duration-100 ease-out hover:bg-em-surface"
            onClick={() => {
              clearError();
              addTrack("group", defaultTrackName("group"));
              setOpen(false);
            }}
          >
            {TRACK_TYPE_LABELS.group}
          </button>
        </div>
      )}
    </div>
  );
}
