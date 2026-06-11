import { PanelTabContent } from "@/components/common/PanelTabContent";
import { PanelTabs } from "@/components/common/PanelTabs";
import { AssetsPanel } from "@/components/assets/AssetsPanel";
import { ProjectPanel } from "@/components/project/ProjectPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUiStore } from "@/stores/uiStore";
import { LayoutTemplate } from "lucide-react";

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
      <ScrollArea className="min-h-0 flex-1">
        <PanelTabContent tabKey={leftTab} className="p-3 text-sm text-muted-foreground">
          {leftTab === "project" && <ProjectPanel />}
          {leftTab === "assets" && <AssetsPanel />}
          {leftTab === "presets" && (
            <EmptyHint
              icon={<LayoutTemplate className="h-10 w-10 text-border" />}
              title="预设"
              hint="浏览预设，快速开始"
            />
          )}
        </PanelTabContent>
      </ScrollArea>
    </aside>
  );
}

function EmptyHint({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 text-center">
      {icon}
      <p className="text-foreground">{title}</p>
      <p className="text-xs">{hint}</p>
    </div>
  );
}
