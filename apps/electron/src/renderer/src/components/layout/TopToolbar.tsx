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
import { PR_SHORTCUTS } from "@/lib/premiereShortcuts";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores/projectStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useUiStore } from "@/stores/uiStore";

function ToolbarButton({
  label,
  children,
  primary,
  disabled,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  primary?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center rounded-sm p-2 transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50",
        primary
          ? "bg-em-accent text-white hover:bg-em-accent-hover"
          : "text-em-text hover:bg-em-elevated"
      )}
    >
      {children}
    </button>
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

  return (
    <header className="z-40 flex h-11 shrink-0 items-center justify-between border-b border-em-border bg-em-bg px-2">
      <div className="flex items-center gap-1">
        <ToolbarButton label="菜单">
          <Menu className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={`撤销 (${PR_SHORTCUTS.undo})`}
          disabled={!canUndo}
          onClick={undo}
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={`重做 (${PR_SHORTCUTS.redo})`}
          disabled={!canRedo}
          onClick={redo}
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={`保存 (${PR_SHORTCUTS.save})`}
          disabled={isLoading}
          onClick={() => void saveProject()}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
        </ToolbarButton>
      </div>
      <div className="flex items-center gap-1">
        <ToolbarButton label="AI 助手" onClick={() => setRightTab("ai")}>
          <Bot className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="渲染">
          <Sparkles className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="导出" primary>
          <Download className="h-4 w-4" />
        </ToolbarButton>
      </div>
    </header>
  );
}
