import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 与触发器圆角一致（Win 11 控件 4px）；白边 + 轻微辉光 */
export const TIMELINE_MENU_PANEL_CLASS =
  "absolute top-full z-[90] mt-1.5 overflow-hidden rounded-md border border-foreground/20 bg-popover p-1 text-popover-foreground shadow-[0_10px_28px_rgba(0,0,0,0.55),0_0_18px_rgba(255,255,255,0.07)]";

export const TIMELINE_MENU_ITEM_CLASS =
  "flex w-full cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50";

/** 菜单展开时去掉触发器上的彩色 focus ring */
export const TIMELINE_MENU_TRIGGER_OPEN_CLASS =
  "border-foreground/25 bg-muted/40 shadow-none focus-visible:border-foreground/25 focus-visible:ring-0";

export function useTimelineToolbarMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  return {
    open,
    setOpen,
    toggle: () => setOpen((v) => !v),
    close: () => setOpen(false),
    rootRef,
  };
}

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
