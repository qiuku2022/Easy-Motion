import { LayoutTemplate } from "lucide-react";
import { PanelTabContent } from "@/components/common/PanelTabContent";
import { PanelTabs } from "@/components/common/PanelTabs";
import { PropertiesPanel } from "@/components/properties/PropertiesPanel";
import { useUiStore } from "@/stores/uiStore";

const TABS = [
  { id: "properties" as const, label: "属性" },
  { id: "templates" as const, label: "模板" },
];

export function RightPanel() {
  const { rightTab, setRightTab } = useUiStore();

  return (
    <aside className="flex h-full min-w-0 flex-col border-l border-border bg-background">
      <PanelTabs tabs={TABS} active={rightTab} onChange={setRightTab} />
      <PanelTabContent
        tabKey={rightTab}
        className="flex min-h-0 flex-1 flex-col p-3 text-sm"
      >
        <div className="scrollbar-theme -mr-1 min-h-0 flex-1 overflow-y-auto px-1">
          {rightTab === "properties" && <PropertiesPanel />}
          {rightTab === "templates" && (
            <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <LayoutTemplate className="h-10 w-10 text-border" aria-hidden />
              <p className="text-foreground">模板</p>
              <p className="text-xs">浏览项目与子项目模板，快速开始</p>
            </div>
          )}
        </div>
      </PanelTabContent>
    </aside>
  );
}
