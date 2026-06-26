import { Copy, Minus, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NO_DRAG = { WebkitAppRegion: "no-drag" } as React.CSSProperties;

interface WindowControlsProps {
  maximized: boolean;
  className?: string;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
}

export function WindowControls({
  maximized,
  className,
  onMinimize,
  onToggleMaximize,
  onClose,
}: WindowControlsProps) {
  const controlClass = cn(
    "h-8 w-10 cursor-pointer rounded-none text-muted-foreground",
    "transition-colors duration-150 ease-out motion-reduce:transition-none",
    "hover:bg-muted hover:text-foreground",
    "focus-visible:ring-3 focus-visible:ring-ring/50",
  );

  return (
    <div className={cn("flex shrink-0 items-stretch", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={controlClass}
        style={NO_DRAG}
        aria-label="最小化"
        onClick={onMinimize}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={controlClass}
        style={NO_DRAG}
        aria-label={maximized ? "还原" : "最大化"}
        onClick={onToggleMaximize}
      >
        {maximized ? (
          <Copy className="h-3.5 w-3.5" />
        ) : (
          <Square className="h-3.5 w-3.5" />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          controlClass,
          "hover:bg-destructive/10 hover:text-destructive",
        )}
        style={NO_DRAG}
        aria-label="关闭"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
