import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ADD_TRACK_TYPES,
  defaultTrackName,
  TRACK_TYPE_LABELS,
} from "@/lib/timeline/trackLabels";
import {
  TimelineMenuItem,
  TimelineMenuPanel,
  TimelineMenuSeparator,
  TIMELINE_MENU_TRIGGER_OPEN_CLASS,
  useTimelineToolbarMenu,
} from "@/lib/timeline/toolbar-menu";
import { useTimelineStore } from "@/stores/timelineStore";

interface AddTrackMenuProps {
  disabled?: boolean;
}

export function AddTrackMenu({ disabled }: AddTrackMenuProps) {
  const { open, toggle, close, rootRef } = useTimelineToolbarMenu();
  const addTrack = useTimelineStore((s) => s.addTrack);
  const clearError = useTimelineStore((s) => s.clearError);

  const handleAdd = (type: Parameters<typeof addTrack>[0]) => {
    clearError();
    addTrack(type, defaultTrackName(type));
    close();
  };

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        className={cn("h-7 gap-1 text-xs", open && TIMELINE_MENU_TRIGGER_OPEN_CLASS)}
        title="添加轨道"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={toggle}
      >
        <Plus className="h-3.5 w-3.5" />
        轨道
        <ChevronDown
          className={cn("h-3 w-3 opacity-60 transition-transform", open && "rotate-180")}
        />
      </Button>

      {open && (
        <TimelineMenuPanel className="min-w-full w-max">
          {ADD_TRACK_TYPES.map((type) => (
            <TimelineMenuItem key={type} onClick={() => handleAdd(type)}>
              {TRACK_TYPE_LABELS[type]}
            </TimelineMenuItem>
          ))}
          <TimelineMenuSeparator />
          <TimelineMenuItem onClick={() => handleAdd("group")}>
            {TRACK_TYPE_LABELS.group}
          </TimelineMenuItem>
        </TimelineMenuPanel>
      )}
    </div>
  );
}
