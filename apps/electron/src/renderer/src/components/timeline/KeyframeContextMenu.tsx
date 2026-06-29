import type { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { VALID_KEYFRAME_EASING } from "@/lib/timeline/keyframes";
import type { Keyframe, KeyframeEasing } from "@/types/timeline";

interface KeyframeContextMenuProps {
  keyframe: Keyframe;
  children: ReactNode;
  onDelete: () => void;
  onSetEasing: (easing: KeyframeEasing) => void;
  onEasyEase?: () => void;
}

export function KeyframeContextMenu({
  keyframe,
  children,
  onDelete,
  onSetEasing,
  onEasyEase,
}: KeyframeContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-44">
        <ContextMenuSub>
          <ContextMenuSubTrigger className="text-xs">缓动</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-40">
            {VALID_KEYFRAME_EASING.map((easing) => (
              <ContextMenuItem
                key={easing}
                className="text-xs"
                onSelect={() => onSetEasing(easing)}
              >
                {easing}
                {keyframe.easing === easing ? " ✓" : ""}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        {onEasyEase && (
          <ContextMenuItem className="text-xs" onSelect={onEasyEase}>
            Easy Ease (F9)
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem className="text-xs text-destructive" onSelect={onDelete}>
          删除关键帧
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
