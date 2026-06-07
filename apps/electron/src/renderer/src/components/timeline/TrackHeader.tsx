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

import { ContextMenu, type ContextMenuItem } from "@/components/common/ContextMenu";

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

  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

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

    <>

      <div
        data-track-header-id={track.id}
        data-track-row-index={rowIndex}
        data-top-level={depth === 0 ? "true" : "false"}
        className={cn(
          "relative box-border flex shrink-0 items-center gap-1 bg-em-bg px-1",
          isDragging && "z-20 opacity-60",
          !effectiveVisible && "opacity-50",
          effectiveLocked && "bg-em-surface/40",
          isGroupHeader && "bg-em-surface/20",
          selected && "ring-1 ring-inset ring-em-teal/40",
          className,
        )}
        style={{
          width: TRACK_HEADER_WIDTH,
          height: TRACK_ROW_HEIGHT,
          paddingLeft: 4 + depth * 14,
          ...style,
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onSelect?.();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
        onClick={() => onSelect?.()}
      >
        {showDropLineAbove && (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-30 h-0.5 bg-em-teal shadow-[0_0_6px_rgba(45,212,191,0.6)]"
            aria-hidden
          />
        )}
        {showDropLineBelow && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-0.5 bg-em-teal shadow-[0_0_6px_rgba(45,212,191,0.6)]"
            aria-hidden
          />
        )}

        {isGroupHeader ? (
          <button
            type="button"
            title={track.collapsed ? "展开分组" : "折叠分组"}
            aria-label={track.collapsed ? "展开分组" : "折叠分组"}
            className="cursor-pointer rounded-sm p-0.5 text-em-muted transition-colors duration-150 ease-out hover:bg-em-elevated hover:text-em-text"
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
          </button>
        ) : null}

        {onReorderStart ? (
        <button

            type="button"

            title="拖拽调整轨道顺序"

            aria-label="拖拽调整轨道顺序"

            className="cursor-grab rounded-sm p-0.5 text-em-muted transition-colors duration-150 ease-out hover:bg-em-elevated hover:text-em-text active:cursor-grabbing"

            onPointerDown={(e) => onReorderStart(e)}

            onClick={(e) => e.stopPropagation()}

          >

            <GripVertical className="h-3.5 w-3.5" />

          </button>
        ) : (
          <span className="w-4 shrink-0" aria-hidden />
        )}



          <button

            type="button"

            title={track.visible ? "隐藏轨道" : "显示轨道"}

            aria-label={track.visible ? "隐藏轨道" : "显示轨道"}

            onClick={(e) => {

              e.stopPropagation();

              toggleVisibility(track.id);

            }}

            className="cursor-pointer rounded-sm p-0.5 text-em-muted transition-colors duration-150 ease-out hover:bg-em-elevated hover:text-em-text"

          >

            {track.visible ? (

              <Icon className="h-3.5 w-3.5 text-em-teal" />

            ) : (

              <EyeOff className="h-3.5 w-3.5" />

            )}

          </button>



          {renaming ? (

            <input

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

              className="min-w-0 flex-1 rounded-sm border border-em-teal bg-em-surface px-1 py-0.5 text-xs text-em-text focus:outline-none focus:ring-1 focus:ring-em-teal"

            />

          ) : (

            <button

              type="button"

              title="双击重命名"

              onDoubleClick={(e) => {

                e.stopPropagation();

                setRenaming(true);

              }}

              className="flex h-6 min-w-0 flex-1 cursor-pointer items-center truncate text-left text-xs leading-none text-em-text"

            >

              {track.name}

            </button>

          )}



          {!isGroupHeader && (
            <button
              type="button"
              title={
                track.solo
                  ? "取消独奏"
                  : "独奏（Alt+点击：仅独奏此轨道）"
              }
              aria-label={track.solo ? "取消独奏" : "独奏"}
              onClick={(e) => {
                e.stopPropagation();
                clearError();
                toggleSolo(track.id, e.altKey);
              }}
              className={cn(
                "cursor-pointer rounded-sm p-0.5 transition-colors duration-150 ease-out hover:bg-em-elevated",
                track.solo
                  ? "text-amber-400"
                  : "text-transparent hover:text-em-text",
              )}
            >
              <Headphones className="h-3 w-3" />
            </button>
          )}



          {track.type === "audio" && (

            <button

              type="button"

              title={track.muted ? "取消静音" : "静音"}

              aria-label={track.muted ? "取消静音" : "静音"}

              onClick={(e) => {

                e.stopPropagation();

                toggleMuted(track.id);

              }}

              className={cn(

                "cursor-pointer rounded-sm p-0.5 transition-colors duration-150 ease-out hover:bg-em-elevated",

                track.muted ? "text-em-warning" : "text-em-muted hover:text-em-text",

              )}

            >

              <VolumeX className="h-3.5 w-3.5" />

            </button>

          )}



          <button

            type="button"

            title={track.locked ? "解锁轨道" : "锁定轨道"}

            aria-label={track.locked ? "解锁轨道" : "锁定轨道"}

            onClick={(e) => {

              e.stopPropagation();

              toggleLock(track.id);

            }}

            className={cn(

              "cursor-pointer rounded-sm p-0.5 transition-colors duration-150 ease-out hover:bg-em-elevated",

              track.locked ? "text-em-muted" : "text-transparent hover:text-em-text",

            )}

          >

            <Lock className="h-3 w-3" />

          </button>



          {!track.visible && (
            <Eye className="h-3 w-3 shrink-0 text-em-muted" aria-hidden />
          )}
      </div>



      {menu && (

        <ContextMenu

          x={menu.x}

          y={menu.y}

          items={contextItems}

          onClose={() => setMenu(null)}

        />

      )}

    </>

  );

}

