import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSlidingTabIndicator } from "@/hooks/useSlidingTabIndicator";
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
      className={cn("w-full shrink-0 gap-0", className)}
    >
      <div ref={listRef} className="relative w-full">
        <TabsList
          variant="line"
          className="flex h-9 w-full rounded-none border-b border-border bg-transparent px-0 pt-1"
        >
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "min-w-0 flex-1 rounded-none px-1 py-1.5 text-center text-sm font-normal text-muted-foreground",
                "transition-colors duration-150 ease-out",
                "hover:text-foreground",
                "data-active:bg-transparent data-active:font-medium data-active:text-foreground",
                "after:hidden",
              )}
            >
              <span className="truncate">{tab.label}</span>
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
