import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type CollapsiblePanelAxis = "horizontal" | "vertical";

interface CollapsiblePanelSlotProps {
  expanded: boolean;
  axis: CollapsiblePanelAxis;
  className?: string;
  innerClassName?: string;
  style?: CSSProperties;
  children: React.ReactNode;
}

/** 视图菜单面板展开/收起（与 KeyframeTrackPanel 相同的 grid 过渡） */
export function CollapsiblePanelSlot({
  expanded,
  axis,
  className,
  innerClassName,
  style,
  children,
}: CollapsiblePanelSlotProps) {
  const isHorizontal = axis === "horizontal";

  return (
    <div
      style={style}
      className={cn(
        "grid motion-reduce:transition-none",
        isHorizontal
          ? "transition-[grid-template-columns] duration-300 ease-in-out"
          : "transition-[grid-template-rows] duration-300 ease-in-out",
        expanded
          ? isHorizontal
            ? "grid-cols-[1fr]"
            : "grid-rows-[1fr]"
          : isHorizontal
            ? "grid-cols-[0fr]"
            : "grid-rows-[0fr]",
        className
      )}
    >
      <div
        className={cn(
          "min-h-0 min-w-0 overflow-hidden transition-opacity duration-300 ease-in-out motion-reduce:transition-none",
          expanded ? "opacity-100" : "pointer-events-none opacity-0",
          innerClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
