import { useCallback, useLayoutEffect, useRef, useState } from "react";

export function useSlidingTabIndicator(active: string) {
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const update = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLElement>('[data-state="active"]');
    if (!el) return;
    setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, []);

  useLayoutEffect(() => {
    update();
  }, [active, update]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const ro = new ResizeObserver(() => update());
    ro.observe(list);
    return () => ro.disconnect();
  }, [update]);

  return { listRef, indicator };
}
