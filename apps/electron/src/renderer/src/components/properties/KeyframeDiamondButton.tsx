import { Diamond } from "lucide-react";
import { cn } from "@/lib/utils";

interface KeyframeDiamondButtonProps {
  /** 播放头处有关键帧 */
  atPlayhead: boolean;
  /** 该属性已有关键帧（其他帧） */
  animated?: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}

export function KeyframeDiamondButton({
  atPlayhead,
  animated,
  disabled,
  title,
  onClick,
}: KeyframeDiamondButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title ?? (atPlayhead ? "删除此帧关键帧" : "在此帧添加关键帧")}
      aria-label={title ?? "关键帧"}
      aria-pressed={atPlayhead}
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-sm transition-colors",
        "hover:bg-accent/60 disabled:pointer-events-none disabled:opacity-40",
        atPlayhead && "text-amber-400",
        !atPlayhead && animated && "text-sky-400/80",
        !atPlayhead && !animated && "text-muted-foreground/45",
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
    >
      <Diamond className={cn("h-3 w-3", atPlayhead && "fill-current")} />
    </button>
  );
}
