import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  TIMELINE_MENU_ITEM_CLASS,
  TIMELINE_MENU_PANEL_CLASS,
} from "@/lib/timeline/toolbar-menu-classes";

export {
  TIMELINE_MENU_ITEM_CLASS,
  TIMELINE_MENU_PANEL_CLASS,
  TIMELINE_MENU_TRIGGER_OPEN_CLASS,
} from "@/lib/timeline/toolbar-menu-classes";

export function TimelineMenuPanel({
  align = "start",
  className,
  children,
}: {
  align?: "start" | "end";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="menu"
      className={cn(
        TIMELINE_MENU_PANEL_CLASS,
        align === "end" ? "right-0" : "left-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TimelineMenuItem({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(TIMELINE_MENU_ITEM_CLASS, className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function TimelineMenuSeparator() {
  return <div role="separator" className="pointer-events-none -mx-1 my-1 h-px bg-border" />;
}
