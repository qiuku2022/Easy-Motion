import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PropertyCollapsibleSectionProps {
  title: string;
  children: ReactNode;
  /** 切换片段等场景下重置为 defaultOpen */
  resetKey?: string;
  defaultOpen?: boolean;
}

export function PropertyCollapsibleSection({
  title,
  children,
  resetKey,
  defaultOpen = true,
}: PropertyCollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [resetKey, defaultOpen]);

  return (
    <div className="text-xs text-muted-foreground">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-1.5 py-0.5 text-left text-foreground transition-colors duration-150 ease-out hover:text-foreground/80"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
            !open && "-rotate-90",
          )}
          aria-hidden
        />
        <span className="font-medium">{title}</span>
      </button>
      <div
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div
          className={cn(
            "min-h-0 transition-opacity duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
            open ? "overflow-visible opacity-100" : "overflow-hidden opacity-0 pointer-events-none",
          )}
        >
          <div className="mt-2 space-y-2 border-t border-border px-px pt-2 pb-2">{children}</div>
        </div>
      </div>
    </div>
  );
}
