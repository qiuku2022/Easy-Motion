import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface TabItem<T extends string> {
  id: T;
  label: string;
}

interface PanelTabsProps<T extends string> {
  tabs: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}

function useSlidingTabIndicator(active: string) {
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

export function PanelTabs<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: PanelTabsProps<T>) {
  const { listRef, indicator } = useSlidingTabIndicator(active);

  return (
    <Tabs
      value={active}
      onValueChange={(value) => onChange(value as T)}
      className={cn("shrink-0 gap-0", className)}
    >
      <div ref={listRef} className="relative">
        <TabsList
          variant="line"
          className="h-9 w-full justify-start rounded-none border-b border-border bg-transparent px-2 pt-1"
        >
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "rounded-none px-3 py-1.5 text-sm font-normal text-muted-foreground",
                "transition-colors duration-150 ease-out",
                "hover:text-foreground",
                "data-active:bg-transparent data-active:font-medium data-active:text-foreground",
                "after:hidden",
              )}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <span
          className="pointer-events-none absolute bottom-0 z-10 h-0.5 rounded-full bg-foreground transition-[left,width] duration-200 ease-out motion-reduce:transition-none"
          style={{ left: indicator.left, width: indicator.width }}
          aria-hidden
        />
      </div>
    </Tabs>
  );
}
