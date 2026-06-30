import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSlidingTabIndicator } from "@/hooks/useSlidingTabIndicator";
import { cn } from "@/lib/utils";

export interface SegmentedTabItem<T extends string> {
  id: T;
  label: string;
}

interface CompactSegmentedTabsProps<T extends string> {
  tabs: SegmentedTabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}

export function CompactSegmentedTabs<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: CompactSegmentedTabsProps<T>) {
  const { listRef, indicator } = useSlidingTabIndicator(active);

  return (
    <Tabs
      value={active}
      onValueChange={(value) => onChange(value as T)}
      className={cn("w-fit shrink-0 gap-0", className)}
    >
      <div ref={listRef} className="relative w-fit">
        <TabsList
          className={cn(
            "relative h-auto w-fit gap-0 rounded-md border border-border/60 bg-background/50 p-0.5 text-xs shadow-none",
          )}
        >
          <span
            className="pointer-events-none absolute inset-y-0.5 rounded-sm bg-primary transition-[left,width] duration-200 ease-out motion-reduce:transition-none"
            style={{ left: indicator.left, width: indicator.width }}
            aria-hidden
          />
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "relative z-10 h-auto flex-none cursor-pointer rounded-sm px-2 py-0.5 text-xs font-normal",
                "text-muted-foreground transition-colors duration-150 ease-out",
                "hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground",
                "data-active:!bg-transparent dark:data-active:!bg-transparent",
                "data-active:!text-primary-foreground dark:data-active:!text-primary-foreground",
                "data-active:font-medium data-active:shadow-none dark:data-active:shadow-none",
                "after:hidden",
              )}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  );
}
