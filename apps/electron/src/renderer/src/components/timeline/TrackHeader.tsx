import { useEffect, useRef, useState } from "react";

import {

  BarChart3,

  ChevronDown,

  ChevronRight,

  Eye,

  EyeOff,

  Folder,

  GripVertical,

  Image,

  Lock,

  Music,

  Shapes,

  Sparkles,

  Type,

  Video,

  VolumeX,

  Headphones,

} from "lucide-react";

import {
  ContextMenuWrapper,
  type ContextMenuItem,
} from "@/components/common/ContextMenu";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { TRACK_HEADER_WIDTH, TRACK_ROW_HEIGHT } from "@/lib/timeline/constants";

import {
  ADD_TRACK_TYPES,
  defaultTrackName,
  TRACK_TYPE_LABELS,
} from "@/lib/timeline/trackLabels";

import type { Track, TrackType } from "@/types/timeline";

import { effectiveTrackState } from "@/lib/timeline/trackTree";
import { useTimelineStore } from "@/stores/timelineStore";



const TRACK_ICONS: Record<TrackType, typeof Type> = {

  text: Type,

  image: Image,

  video: Video,

  audio: Music,

  shape: Shapes,

  chart: BarChart3,

  animation: Sparkles,

  group: Folder,

};

function TrackHeaderIconButton({
  label,
  className,
  children,
  onClick,
  onPointerDown,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className={cn("shrink-0", className)}
          aria-label={label}
          onClick={onClick}
          onPointerDown={onPointerDown}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

interface TrackHeaderProps {

  track: Track;

  rowIndex: number;

  className?: string;

  style?: React.CSSProperties;

  selected?: boolean;

  isDragging?: boolean;

  showDropLineAbove?: boolean;

  showDropLineBelow?: boolean;

  onSelect?: () => void;

  onReorderStart?: (e: React.PointerEvent) => void;

  depth?: number;

  parentGroup?: Track | null;

  isGroupHeader?: boolean;

}



export function TrackHeader({

  track,

  rowIndex,

  className,

  style,

  selected,

  isDragging,

  showDropLineAbove,

  showDropLineBelow,

  onSelect,

  onReorderStart,

  depth = 0,

  parentGroup = null,

  isGroupHeader = false,

}: TrackHeaderProps) {

  const [renaming, setRenaming] = useState(false);

  const [draft, setDraft] = useState(track.name);

  const inputRef = useRef<HTMLInputElement>(null);



  const toggleVisibility = useTimelineStore((s) => s.toggleTrackVisibility);

  const toggleLock = useTimelineStore((s) => s.toggleTrackLock);

  const toggleMuted = useTimelineStore((s) => s.toggleTrackMuted);

  const toggleSolo = useTimelineStore((s) => s.toggleTrackSolo);

  const timeline = useTimelineStore((s) => s.timeline);

  const renameTrack = useTimelineStore((s) => s.renameTrack);

  const confirmRemoveTrack = useTimelineStore((s) => s.confirmRemoveTrack);

  const addChildTrack = useTimelineStore((s) => s.addChildTrack);

  const toggleGroupCollapsed = useTimelineStore((s) => s.toggleGroupCollapsed);

  const clearError = useTimelineStore((s) => s.clearError);

  const { locked: effectiveLocked, visible: effectiveVisible } = effectiveTrackState(
    track,
    parentGroup,
    timeline,
  );



  const Icon = TRACK_ICONS[track.type] ?? Type;



  useEffect(() => {

    if (renaming) {

      inputRef.current?.focus();

      inputRef.current?.select();

    }

  }, [renaming]);



  useEffect(() => {

    if (!renaming) setDraft(track.name);

  }, [track.name, renaming]);



  const commitRename = () => {

    setRenaming(false);

    const trimmed = draft.trim();

    if (trimmed && trimmed !== track.name) {

      clearError();

      renameTrack(track.id, trimmed);

    } else {

      setDraft(track.name);

    }

  };



  const contextItems: ContextMenuItem[] = [

    ...(isGroupHeader

      ? ADD_TRACK_TYPES.map((type) => ({

          id: `add-child-${type}`,

          label: `添加子轨道：${TRACK_TYPE_LABELS[type]}`,

          onClick: () => {

            clearError();

            addChildTrack(track.id, type, defaultTrackName(type));

          },

        }))

      : []),

    {

      id: "rename",

      label: "重命名",

      onClick: () => setRenaming(true),

    },

    {

      id: "visibility",

      label: track.visible ? "隐藏轨道" : "显示轨道",

      onClick: () => toggleVisibility(track.id),

    },

    {

      id: "lock",

      label: track.locked ? "解锁轨道" : "锁定轨道",

      onClick: () => toggleLock(track.id),

    },

    ...(track.type === "audio"

      ? [

          {

            id: "mute",

            label: track.muted ? "取消静音" : "静音",

            onClick: () => toggleMuted(track.id),

          } satisfies ContextMenuItem,

        ]

      : []),

    ...(!isGroupHeader

      ? [

          {

            id: "solo",

            label: track.solo ? "取消独奏" : "独奏",

            onClick: () => toggleSolo(track.id),

          } satisfies ContextMenuItem,

        ]

      : []),

    {

      id: "delete",

      label: "删除轨道",

      danger: true,

      onClick: () => {

        clearError();

        confirmRemoveTrack(track.id);

      },

    },

  ];



  return (
    <ContextMenuWrapper items={contextItems} onOpen={() => onSelect?.()}>
      <div
        data-track-header-id={track.id}
        data-track-row-index={rowIndex}
        data-top-level={depth === 0 ? "true" : "false"}
        className={cn(
          "group/track relative box-border flex min-w-0 shrink-0 items-center gap-0.5 overflow-hidden bg-background pr-1",
          "before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:z-10 before:w-0.5 before:scale-y-0 before:bg-foreground before:transition-transform before:duration-150 before:content-['']",
          selected && "bg-muted/45 before:scale-y-100",
          isDragging && "z-20 opacity-60",
          !effectiveVisible && "opacity-50",
          effectiveLocked && !selected && "bg-muted/25",
          isGroupHeader && !selected && "bg-muted/15",
          className,
        )}
        style={{
          width: TRACK_HEADER_WIDTH,
          height: TRACK_ROW_HEIGHT,
          paddingLeft: 6 + depth * 12,
          ...style,
        }}
        onClick={() => onSelect?.()}
      >
        {showDropLineAbove && (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-30 h-px bg-foreground/70"
            aria-hidden
          />
        )}
        {showDropLineBelow && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-px bg-foreground/70"
            aria-hidden
          />
        )}

        {isGroupHeader ? (
          <TrackHeaderIconButton
            label={track.collapsed ? "展开分组" : "折叠分组"}
            className="text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              toggleGroupCollapsed(track.id);
            }}
          >
            {track.collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </TrackHeaderIconButton>
        ) : null}

        {onReorderStart ? (
          <TrackHeaderIconButton
            label="拖拽调整轨道顺序"
            className="cursor-grab text-muted-foreground active:cursor-grabbing hover:text-foreground"
            onPointerDown={(e) => onReorderStart(e)}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </TrackHeaderIconButton>
        ) : (
          <span className="w-4 shrink-0" aria-hidden />
        )}



          <TrackHeaderIconButton
            label={track.visible ? "隐藏轨道" : "显示轨道"}
            className="text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              toggleVisibility(track.id);
            }}
          >
            {track.visible ? (
              <Icon className="h-3.5 w-3.5 text-foreground/80" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
          </TrackHeaderIconButton>



          {renaming ? (

            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setDraft(track.name);
                  setRenaming(false);
                }
              }}
              className="h-6 min-w-0 flex-1 rounded-sm px-1 py-0.5 text-xs"
            />

          ) : (

            <button

              type="button"

              title="双击重命名"

              onDoubleClick={(e) => {

                e.stopPropagation();

                setRenaming(true);

              }}

              className={cn(
                "min-w-0 flex-1 cursor-pointer truncate rounded-md px-1 py-0.5 text-left text-xs leading-tight hover:bg-muted",
                selected ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )}

            >

              {track.name}

            </button>

          )}



          <div
            className={cn(
              "flex shrink-0 items-center gap-0 transition-opacity duration-150",
              !track.solo &&
                !track.muted &&
                !track.locked &&
                !selected &&
                "opacity-0 group-hover/track:opacity-100 group-focus-within/track:opacity-100",
            )}
          >
            {!isGroupHeader && (
              <TrackHeaderIconButton
                label={
                  track.solo
                    ? "取消独奏"
                    : "独奏（Alt+点击：仅独奏此轨道）"
                }
                className={cn(
                  track.solo ? "text-amber-400" : "text-muted-foreground",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  clearError();
                  toggleSolo(track.id, e.altKey);
                }}
              >
                <Headphones className="h-3 w-3" />
              </TrackHeaderIconButton>
            )}

            {track.type === "audio" && (
              <TrackHeaderIconButton
                label={track.muted ? "取消静音" : "静音"}
                className={cn(
                  track.muted ? "text-warning" : "text-muted-foreground",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMuted(track.id);
                }}
              >
                <VolumeX className="h-3.5 w-3.5" />
              </TrackHeaderIconButton>
            )}

            <TrackHeaderIconButton
              label={track.locked ? "解锁轨道" : "锁定轨道"}
              className={cn(
                track.locked ? "text-muted-foreground" : "text-muted-foreground",
              )}
              onClick={(e) => {
                e.stopPropagation();
                toggleLock(track.id);
              }}
            >
              <Lock className="h-3 w-3" />
            </TrackHeaderIconButton>
          </div>



          {!track.visible && (
            <Eye className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
          )}
      </div>
    </ContextMenuWrapper>
  );

}

