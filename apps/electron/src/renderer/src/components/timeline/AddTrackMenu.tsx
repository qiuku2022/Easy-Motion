import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const handleAdd = (type: Parameters<typeof addTrack>[0]) => {
    clearError();
    addTrack(type, defaultTrackName(type));
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        className="h-7 gap-1 text-xs"
        title="添加轨道"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <Plus className="h-3.5 w-3.5" />
        轨道
        <ChevronDown
          className={cn("h-3 w-3 opacity-60 transition-transform", open && "rotate-180")}
        />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-[90] mt-1 w-max min-w-full rounded-lg border border-border bg-popover p-0.5 text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          {ADD_TRACK_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              role="menuitem"
              className="flex w-full cursor-default whitespace-nowrap rounded-md px-2 py-0.5 text-left text-xs outline-none hover:bg-accent hover:text-accent-foreground"
              onClick={() => handleAdd(type)}
            >
              {TRACK_TYPE_LABELS[type]}
            </button>
          ))}
          <div className="my-0.5 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full cursor-default whitespace-nowrap rounded-md px-2 py-0.5 text-left text-xs outline-none hover:bg-accent hover:text-accent-foreground"
            onClick={() => handleAdd("group")}
          >
            {TRACK_TYPE_LABELS.group}
          </button>
        </div>
      )}
    </div>
  );
}
