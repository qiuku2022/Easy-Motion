import {
  Bot,
  Download,
  Loader2,
  Menu,
  Redo2,
  Save,
  Sparkles,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PR_SHORTCUTS } from "@/lib/premiereShortcuts";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores/projectStore";
import { toast } from "sonner";
import { useTimelineStore } from "@/stores/timelineStore";
import { useUiStore } from "@/stores/uiStore";
import { getEasyMotion } from "@/types/easyMotion";

function ToolbarIconButton({
  label,
  children,
  variant = "ghost",
  disabled,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  variant?: "ghost" | "default" | "outline";
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size="icon"
          className="h-8 w-8"
          disabled={disabled}
          onClick={onClick}
        >
          {children}
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

export function TopToolbar() {
  const saveProject = useProjectStore((s) => s.saveProject);
  const isLoading = useProjectStore((s) => s.isLoading);
  const setRightTab = useUiStore((s) => s.setRightTab);
  const undo = useTimelineStore((s) => s.undo);
  const redo = useTimelineStore((s) => s.redo);
  const canUndo = useTimelineStore((s) => s.history.past.length > 0);
  const canRedo = useTimelineStore((s) => s.history.future.length > 0);
  const shell = getEasyMotion()?.shell;

  return (
    <header
      className={cn(
        "z-40 flex h-11 shrink-0 items-center justify-between border-b border-border bg-background px-2",
        shell?.trafficLightInset && "pl-[4.5rem]",
      )}
    >
      <div className="flex items-center gap-1">
        <ToolbarIconButton label="菜单">
          <Menu className="h-4 w-4" />
        </ToolbarIconButton>
        <ToolbarIconButton
          label={`撤销 (${PR_SHORTCUTS.undo})`}
          disabled={!canUndo}
          onClick={undo}
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarIconButton>
        <ToolbarIconButton
          label={`重做 (${PR_SHORTCUTS.redo})`}
          disabled={!canRedo}
          onClick={redo}
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarIconButton>
        <ToolbarIconButton
          label={`保存 (${PR_SHORTCUTS.save})`}
          disabled={isLoading}
          onClick={() => {
            void (async () => {
              const ok = await saveProject();
              if (ok) {
                toast.success("项目已保存");
                return;
              }
              const message = useProjectStore.getState().error;
              toast.error("保存失败", {
                description: message ?? undefined,
              });
            })();
          }}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
        </ToolbarIconButton>
      </div>
      <div className="flex items-center gap-1">
        <ToolbarIconButton label="AI 助手" onClick={() => setRightTab("ai")}>
          <Bot className="h-4 w-4" />
        </ToolbarIconButton>
        <ToolbarIconButton label="渲染">
          <Sparkles className="h-4 w-4" />
        </ToolbarIconButton>
        <ToolbarIconButton label="导出" variant="outline">
          <Download className="h-4 w-4" />
        </ToolbarIconButton>
      </div>
    </header>
  );
}
