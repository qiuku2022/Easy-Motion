import { cn } from "@/lib/utils";
import type { AgentCreationMode } from "@/types/settings";

const MODE_OPTIONS: { value: AgentCreationMode; label: string; title: string }[] = [
  { value: "quick", label: "快速", title: "仅时间线工具（标题、预设、背景等）" },
  { value: "free", label: "自由", title: "时间线 + Remotion 源码（自定义组件）" },
  { value: "auto", label: "自动", title: "按描述自动选择工具集" },
];

interface AgentCreationModeToggleProps {
  value: AgentCreationMode;
  disabled?: boolean;
  onChange: (mode: AgentCreationMode) => void;
}

export function AgentCreationModeToggle({
  value,
  disabled,
  onChange,
}: AgentCreationModeToggleProps) {
  return (
    <div
      className="inline-flex rounded-md border border-border bg-muted/40 p-0.5"
      role="group"
      aria-label="创作模式"
    >
      {MODE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.title}
          disabled={disabled}
          className={cn(
            "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
            value === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
            disabled && "pointer-events-none opacity-50"
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
