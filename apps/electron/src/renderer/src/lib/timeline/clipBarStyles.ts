import { cn } from "@/lib/utils";

type ClipBarVariant = {
  idle: string;
  selected: string;
  disabled: string;
};

/** 时间线图层条：按类型区分、偏柔和的实心填充 */
const CLIP_BAR_VARIANTS: Record<string, ClipBarVariant> = {
  text: {
    idle: "border-violet-900/70 bg-violet-950/75 text-violet-200/90",
    selected:
      "border-violet-600/80 bg-violet-900/85 text-violet-100 ring-2 ring-violet-500/35",
    disabled: "border-violet-950/50 bg-violet-950/40 text-violet-300/40",
  },
  video: {
    idle: "border-blue-900/70 bg-blue-950/75 text-blue-200/90",
    selected: "border-blue-600/80 bg-blue-900/85 text-blue-100 ring-2 ring-blue-500/35",
    disabled: "border-blue-950/50 bg-blue-950/40 text-blue-300/40",
  },
  audio: {
    idle: "border-emerald-900/70 bg-emerald-950/75 text-emerald-200/90",
    selected:
      "border-emerald-600/80 bg-emerald-900/85 text-emerald-100 ring-2 ring-emerald-500/35",
    disabled: "border-emerald-950/50 bg-emerald-950/40 text-emerald-300/40",
  },
  image: {
    idle: "border-teal-900/70 bg-teal-950/75 text-teal-200/90",
    selected: "border-teal-600/80 bg-teal-900/85 text-teal-100 ring-2 ring-teal-500/35",
    disabled: "border-teal-950/50 bg-teal-950/40 text-teal-300/40",
  },
  shape: {
    idle: "border-amber-900/70 bg-amber-950/75 text-amber-200/90",
    selected:
      "border-amber-600/80 bg-amber-900/85 text-amber-100 ring-2 ring-amber-500/35",
    disabled: "border-amber-950/50 bg-amber-950/40 text-amber-300/40",
  },
  chart: {
    idle: "border-rose-900/70 bg-rose-950/75 text-rose-200/90",
    selected: "border-rose-600/80 bg-rose-900/85 text-rose-100 ring-2 ring-rose-500/35",
    disabled: "border-rose-950/50 bg-rose-950/40 text-rose-300/40",
  },
  animation: {
    idle: "border-indigo-900/70 bg-indigo-950/75 text-indigo-200/90",
    selected:
      "border-indigo-600/80 bg-indigo-900/85 text-indigo-100 ring-2 ring-indigo-500/35",
    disabled: "border-indigo-950/50 bg-indigo-950/40 text-indigo-300/40",
  },
  default: {
    idle: "border-zinc-700/80 bg-zinc-800/85 text-zinc-200/90",
    selected: "border-zinc-500/80 bg-zinc-700/90 text-zinc-100 ring-2 ring-zinc-400/30",
    disabled: "border-zinc-800/50 bg-zinc-900/45 text-zinc-400/40",
  },
};

export function clipBarClassName(
  contentType: string,
  state: { selected: boolean; disabled: boolean; dragging?: boolean },
): string {
  const variant = CLIP_BAR_VARIANTS[contentType] ?? CLIP_BAR_VARIANTS.default;

  return cn(
    "h-full w-full truncate rounded-[3px] border px-1.5 text-left text-[11px] font-medium",
    "transition-[filter,box-shadow,border-color,ring] duration-100 ease-out",
    state.disabled
      ? cn(variant.disabled, "cursor-not-allowed")
      : state.selected
        ? cn(variant.selected, "cursor-grab shadow-sm active:cursor-grabbing")
        : cn(
            variant.idle,
            "cursor-grab hover:brightness-105 active:cursor-grabbing",
          ),
    state.dragging && !state.disabled && "opacity-95 ring-2 ring-white/20",
  );
}

export function clipBarHandleClassName(selected: boolean): string {
  return cn(
    "absolute bottom-0 top-0 z-10 w-1.5 cursor-ew-resize",
    selected
      ? "bg-white/55 hover:bg-white/75"
      : "bg-black/20 hover:bg-black/30",
  );
}
