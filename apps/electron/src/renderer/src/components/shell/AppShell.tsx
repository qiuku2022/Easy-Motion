import { AppLayout } from "@/components/layout/AppLayout";
import { TopToolbar } from "@/components/layout/TopToolbar";
import { ProjectBootstrapOverlay } from "@/components/shell/ProjectBootstrapOverlay";
import { TitleBar } from "@/components/shell/TitleBar";
import { useProjectBootstrap } from "@/hooks/useProjectBootstrap";
import { cn } from "@/lib/utils";

export function AppShell() {
  const { isBootstrapping, message } = useProjectBootstrap();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-card">
      <TitleBar />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-x border-b border-border bg-background">
        <TopToolbar />
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div
            className={cn(
              "flex h-full min-h-0 flex-col overflow-hidden transition-opacity duration-300 ease-in-out motion-reduce:transition-none",
              isBootstrapping ? "opacity-0" : "opacity-100"
            )}
          >
            <AppLayout />
          </div>
          <ProjectBootstrapOverlay visible={isBootstrapping} message={message} />
        </div>
      </div>
    </div>
  );
}
