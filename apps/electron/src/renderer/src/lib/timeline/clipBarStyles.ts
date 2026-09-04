import { cn } from "@/lib/utils";

type ClipBarVariant = {
  idle: string;
  selected: string;
  disabled: string;
};

/** 时间线图层条：按类型区分、遵循 Primer 15%~25% 明度深色底 + 1px 亮边 */
const CLIP_BAR_VARIANTS: Record<string, ClipBarVariant> = {
  text: {
    idle: "border-track-text-border/70 bg-track-text/85 text-[#e3b341]",
    selected:
      "border-white bg-track-text text-white ring-2 ring-blue-500/50 shadow-md",
    disabled: "border-track-text-border/30 bg-track-text/30 text-white/30",
  },
  video: {
    idle: "border-track-video-border/70 bg-track-video/85 text-[#aff5b4]",
    selected:
      "border-white bg-track-video text-white ring-2 ring-blue-500/50 shadow-md",
    disabled: "border-track-video-border/30 bg-track-video/30 text-white/30",
  },
  audio: {
    idle: "border-track-audio-border/70 bg-track-audio/85 text-[#79c0ff]",
    selected:
      "border-white bg-track-audio text-white ring-2 ring-blue-500/50 shadow-md",
    disabled: "border-track-audio-border/30 bg-track-audio/30 text-white/30",
  },
  image: {
    idle: "border-track-image-border/70 bg-track-image/85 text-[#7ee787]",
    selected:
      "border-white bg-track-image text-white ring-2 ring-blue-500/50 shadow-md",
    disabled: "border-track-image-border/30 bg-track-image/30 text-white/30",
  },
  shape: {
    idle: "border-track-shape-border/70 bg-track-shape/85 text-[#ffa657]",
    selected:
      "border-white bg-track-shape text-white ring-2 ring-blue-500/50 shadow-md",
    disabled: "border-track-shape-border/30 bg-track-shape/30 text-white/30",
  },
  chart: {
    idle: "border-track-chart-border/70 bg-track-chart/85 text-[#ff7b72]",
    selected:
      "border-white bg-track-chart text-white ring-2 ring-blue-500/50 shadow-md",
    disabled: "border-track-chart-border/30 bg-track-chart/30 text-white/30",
  },
  animation: {
    idle: "border-track-fx-border/70 bg-track-fx/85 text-[#d2a8ff]",
    selected:
      "border-white bg-track-fx text-white ring-2 ring-purple-500/50 shadow-md",
    disabled: "border-track-fx-border/30 bg-track-fx/30 text-white/30",
  },
  default: {
    idle: "border-track-default-border/70 bg-track-default/85 text-[#c9d1d9]",
    selected:
      "border-white bg-track-default text-white ring-2 ring-blue-500/50 shadow-md",
    disabled: "border-track-default-border/30 bg-track-default/30 text-white/30",
  },
};

export function clipBarClassName(
  contentType: string,
  state: { selected: boolean; disabled: boolean; dragging?: boolean }
): string {
  const variant = CLIP_BAR_VARIANTS[contentType] ?? CLIP_BAR_VARIANTS.default;

  return cn(
    "h-full w-full truncate rounded-[4px] border px-1.5 text-left text-[11px] font-medium",
    "transition-[filter,box-shadow,border-color,ring] duration-100 ease-out",
    state.disabled
      ? cn(variant.disabled, "cursor-not-allowed")
      : state.selected
        ? cn(variant.selected, "cursor-grab shadow-sm active:cursor-grabbing")
        : cn(variant.idle, "cursor-grab hover:brightness-110 active:cursor-grabbing"),
    state.dragging && !state.disabled && "opacity-95 ring-2 ring-white/30"
  );
}

export function clipBarHandleClassName(selected: boolean): string {
  return cn(
    "absolute bottom-0 top-0 z-10 w-1.5 cursor-ew-resize",
    selected ? "bg-white/60 hover:bg-white/80" : "bg-black/20 hover:bg-black/30"
  );
}
