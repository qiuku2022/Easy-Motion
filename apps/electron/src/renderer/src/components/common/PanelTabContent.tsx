import { cn } from "@/lib/utils";

interface PanelTabContentProps {
  tabKey: string;
  className?: string;
  children: React.ReactNode;
}

/** 面板 Tab 内容切换淡入（150ms）；`tabKey` 变化时重挂载触发动画 */
export function PanelTabContent({
  tabKey,
  className,
  children,
}: PanelTabContentProps) {
  return (
    <div
      key={tabKey}
      className={cn(
        "animate-in fade-in-50 duration-150 motion-reduce:animate-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
