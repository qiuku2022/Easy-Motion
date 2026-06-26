import { PanelTabContent } from "@/components/common/PanelTabContent";
import { PanelTabs } from "@/components/common/PanelTabs";
import { AssetsPanel } from "@/components/assets/AssetsPanel";
import { PresetPanel } from "@/components/presets/PresetPanel";
import { ProjectPanel } from "@/components/project/ProjectPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUiStore } from "@/stores/uiStore";

const TABS = [
  { id: "project" as const, label: "项目" },
  { id: "assets" as const, label: "素材" },
  { id: "presets" as const, label: "预设" },
];

export function LeftPanel() {
  const { leftTab, setLeftTab } = useUiStore();

  return (
    <aside className="flex h-full min-w-0 flex-col border-r border-border bg-background">
      <PanelTabs tabs={TABS} active={leftTab} onChange={setLeftTab} />
      {leftTab === "presets" ? (
        <PanelTabContent
          tabKey={leftTab}
          className="flex min-h-0 flex-1 flex-col p-3 text-sm text-muted-foreground"
        >
          <PresetPanel />
        </PanelTabContent>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <PanelTabContent tabKey={leftTab} className="p-3 text-sm text-muted-foreground">
            {leftTab === "project" && <ProjectPanel />}
            {leftTab === "assets" && <AssetsPanel />}
          </PanelTabContent>
        </ScrollArea>
      )}
    </aside>
  );
}
