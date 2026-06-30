/** 与触发器圆角一致（Win 11 控件 4px）；白边 + 轻微辉光 */
export const TIMELINE_MENU_PANEL_CLASS =
  "absolute top-full z-[90] mt-1.5 overflow-hidden rounded-md border border-foreground/20 bg-popover p-1 text-popover-foreground shadow-[0_10px_28px_rgba(0,0,0,0.55),0_0_18px_rgba(255,255,255,0.07)]";

export const TIMELINE_MENU_ITEM_CLASS =
  "flex w-full cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50";

/** 菜单展开时去掉触发器上的彩色 focus ring */
export const TIMELINE_MENU_TRIGGER_OPEN_CLASS =
  "border-foreground/25 bg-muted/40 shadow-none focus-visible:border-foreground/25 focus-visible:ring-0";
