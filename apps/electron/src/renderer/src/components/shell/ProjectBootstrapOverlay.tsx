import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectBootstrapOverlayProps {
  visible: boolean;
  message: string;
}

export function ProjectBootstrapOverlay({ visible, message }: ProjectBootstrapOverlayProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-[2px] transition-opacity duration-300 ease-in-out motion-reduce:transition-none",
        visible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      )}
      aria-hidden={!visible}
      aria-live="polite"
    >
      <div
        className={cn(
          "flex flex-col items-center gap-3 rounded-lg border border-border bg-background px-8 py-6 shadow-md transition-all duration-300 ease-in-out motion-reduce:transition-none",
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        )}
      >
        <Loader2 className="h-7 w-7 animate-spin text-ring" aria-hidden />
        <p className="text-sm text-foreground">{message}</p>
      </div>
    </div>
  );
}
