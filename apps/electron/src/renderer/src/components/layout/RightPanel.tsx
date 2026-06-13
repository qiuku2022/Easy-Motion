import { AIAssistantPanel } from "@/components/ai/AIAssistantPanel";
import { PanelTabContent } from "@/components/common/PanelTabContent";
import { PanelTabs } from "@/components/common/PanelTabs";
import { PropertiesPanel } from "@/components/properties/PropertiesPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";

const TABS = [
  { id: "properties" as const, label: "属性" },
  { id: "assets" as const, label: "素材" },
  { id: "presets" as const, label: "预设" },
  { id: "ai" as const, label: "AI 助手" },
];

export function RightPanel() {
  const { rightTab, setRightTab } = useUiStore();

  return (
    <aside className="flex h-full min-w-0 flex-col border-l border-border bg-background">
      <PanelTabs tabs={TABS} active={rightTab} onChange={setRightTab} />
      {/* 保持挂载，避免切换 Tab 时对话 state 丢失 */}
      <PanelTabContent
        tabKey="ai"
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          rightTab !== "ai" && "hidden",
        )}
      >
        <AIAssistantPanel />
      </PanelTabContent>
      <ScrollArea
        className={cn("min-h-0 flex-1", rightTab === "ai" && "hidden")}
      >
        <PanelTabContent tabKey={rightTab} className="p-3 text-sm">
          {rightTab === "properties" && <PropertiesPanel />}
          {rightTab === "assets" && (
            <p className="text-muted-foreground">快捷素材区</p>
          )}
          {rightTab === "presets" && (
            <p className="text-muted-foreground">预设浏览</p>
          )}
        </PanelTabContent>
      </ScrollArea>
    </aside>
  );
}
