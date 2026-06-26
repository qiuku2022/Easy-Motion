import { AppLayout } from "@/components/layout/AppLayout";
import { TopToolbar } from "@/components/layout/TopToolbar";
import { TitleBar } from "@/components/shell/TitleBar";

export function AppShell() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-card">
      <TitleBar />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-x border-b border-border bg-background">
        <TopToolbar />
        <AppLayout />
      </div>
    </div>
  );
}
