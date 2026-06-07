import { PanelTabs } from "@/components/common/PanelTabs";
import { PropertiesPanel } from "@/components/properties/PropertiesPanel";
import { useUiStore } from "@/stores/uiStore";
import { Bot, Sparkles } from "lucide-react";

const TABS = [
  { id: "properties" as const, label: "属性" },
  { id: "assets" as const, label: "素材" },
  { id: "presets" as const, label: "预设" },
  { id: "ai" as const, label: "AI 助手" },
];

export function RightPanel() {
  const { rightTab, setRightTab } = useUiStore();

  return (
    <aside className="flex h-full min-w-0 flex-col border-l border-em-border bg-em-bg">
      <PanelTabs tabs={TABS} active={rightTab} onChange={setRightTab} />
      <div className="flex flex-1 flex-col overflow-auto p-3 text-sm">
        {rightTab === "properties" && <PropertiesPanel />}
        {rightTab === "assets" && <p className="text-em-muted">快捷素材区</p>}
        {rightTab === "presets" && <p className="text-em-muted">预设浏览</p>}
        {rightTab === "ai" && (
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex items-center gap-2 text-em-muted">
              <Bot className="h-4 w-4" />
              <span>向 AI 描述你的动画…</span>
            </div>
            <div className="mt-auto flex gap-2">
              <input
                type="text"
                placeholder="描述你的动画..."
                className="flex-1 rounded-md border border-em-border bg-em-surface px-3 py-2 text-em-text placeholder:text-em-muted focus:border-em-teal focus:outline-none focus:ring-1 focus:ring-em-teal"
              />
              <button
                type="button"
                className="cursor-pointer rounded-sm bg-em-accent px-3 py-2 text-white transition-colors duration-150 ease-out hover:bg-em-accent-hover"
                aria-label="发送"
              >
                <Sparkles className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
