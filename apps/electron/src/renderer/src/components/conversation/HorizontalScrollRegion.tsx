import {
  forwardRef,
  useEffect,
  useRef,
  type HTMLAttributes,
  type MutableRefObject,
  type MouseEvent,
} from "react";
import { cn } from "@/lib/utils";

export const HSCROLL_HOVER_EVENT = "em:hscroll-hover";

type HorizontalScrollRegionProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "pre";
};

function setHScrollHover(active: boolean) {
  document.dispatchEvent(new CustomEvent(HSCROLL_HOVER_EVENT, { detail: { active } }));
}

export const HorizontalScrollRegion = forwardRef<
  HTMLDivElement | HTMLPreElement,
  HorizontalScrollRegionProps
>(function HorizontalScrollRegion(
  { as = "div", className, children, onMouseEnter, onMouseLeave, ...props },
  forwardedRef
) {
  const localRef = useRef<HTMLDivElement | HTMLPreElement>(null);

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;

    const onWheel = (event: Event) => {
      if (!(event instanceof WheelEvent)) return;
      if (el.scrollWidth <= el.clientWidth + 1) return;

      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (delta === 0) return;

      event.preventDefault();
      event.stopPropagation();

      const maxScroll = el.scrollWidth - el.clientWidth;
      el.scrollLeft = Math.max(0, Math.min(maxScroll, el.scrollLeft + delta));
    };

    el.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => el.removeEventListener("wheel", onWheel, { capture: true });
  }, []);

  const setRef = (node: HTMLDivElement | HTMLPreElement | null) => {
    (localRef as MutableRefObject<HTMLDivElement | HTMLPreElement | null>).current =
      node;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      (
        forwardedRef as MutableRefObject<HTMLDivElement | HTMLPreElement | null>
      ).current = node;
    }
  };

  const handleMouseEnter = (event: MouseEvent<HTMLElement>) => {
    setHScrollHover(true);
    onMouseEnter?.(event);
  };

  const handleMouseLeave = (event: MouseEvent<HTMLElement>) => {
    setHScrollHover(false);
    onMouseLeave?.(event);
  };

  const shared = {
    ref: setRef,
    "data-hscroll-region": true,
    className: cn("scrollbar-shadcn overscroll-x-contain", className),
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    ...props,
  };

  if (as === "pre") {
    return <pre {...shared}>{children}</pre>;
  }

  return <div {...shared}>{children}</div>;
});
