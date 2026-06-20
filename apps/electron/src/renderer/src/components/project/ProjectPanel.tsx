import { useEffect, useState } from "react";
import { FolderOpen, FolderPlus, Loader2, RefreshCw } from "lucide-react";
import { ContextMenuWrapper } from "@/components/common/ContextMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores/projectStore";

function formatModifiedAt(timestamp: number) {
  if (!timestamp) return "未知时间";
  return new Date(timestamp).toLocaleString();
}

export function ProjectPanel() {
  const current = useProjectStore((s) => s.current);
  const localProjects = useProjectStore((s) => s.localProjects);
  const localScanRoot = useProjectStore((s) => s.localScanRoot);
  const isLoading = useProjectStore((s) => s.isLoading);
  const isLoadingLocal = useProjectStore((s) => s.isLoadingLocal);
  const error = useProjectStore((s) => s.error);
  const createProject = useProjectStore((s) => s.createProject);
  const openProjectByPicker = useProjectStore((s) => s.openProjectByPicker);
  const openProjectByPath = useProjectStore((s) => s.openProjectByPath);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const loadLocalProjects = useProjectStore((s) => s.loadLocalProjects);
  const clearError = useProjectStore((s) => s.clearError);

  const [name, setName] = useState("演示项目");

  useEffect(() => {
    void loadLocalProjects();
  }, [loadLocalProjects]);

  return (
    <div className="flex flex-col gap-3 text-sm">
      {current ? (
        <div className="rounded-md border border-border bg-card p-3">
          <p className="font-medium text-foreground">{current.name}</p>
          <p className="mt-1 break-all text-xs text-muted-foreground">{current.path}</p>
        </div>
      ) : (
        <p className="text-muted-foreground">尚未打开项目</p>
      )}

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="project-name" className="text-xs text-muted-foreground">
          项目名称
        </Label>
        <Input
          id="project-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="演示项目"
          onKeyDown={(event) => {
            if (event.key !== "Enter" || isLoading) return;
            clearError();
            void createProject(name);
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isLoading}
          className="w-full gap-2"
          onClick={() => {
            clearError();
            void createProject(name);
          }}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FolderPlus className="h-4 w-4" />
          )}
          新建项目
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isLoading}
          className="w-full gap-2"
          onClick={() => {
            clearError();
            void openProjectByPicker();
          }}
        >
          <FolderOpen className="h-4 w-4" />
          打开项目…
        </Button>
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">本地项目</p>
            {localScanRoot ? (
              <p className="truncate text-[11px] text-muted-foreground" title={localScanRoot}>
                扫描：{localScanRoot}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="刷新项目列表"
            disabled={isLoadingLocal}
            onClick={() => void loadLocalProjects()}
          >
            {isLoadingLocal ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {isLoadingLocal && localProjects.length === 0 ? (
          <p className="text-xs text-muted-foreground">正在扫描本地项目…</p>
        ) : localProjects.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            未找到项目。新建项目后会出现在这里。
          </p>
        ) : (
          <ScrollArea className="max-h-64">
            <ul className="flex flex-col gap-1.5 pr-2">
              {localProjects.map((project) => {
                const isCurrent = current?.path === project.path;

                return (
                  <li key={project.path}>
                    <ContextMenuWrapper
                      items={[
                        {
                          id: "delete",
                          label: "删除项目",
                          danger: true,
                          disabled: isLoading,
                          onClick: () => {
                            clearError();
                            void deleteProject(project.path);
                          },
                        },
                      ]}
                    >
                      <button
                        type="button"
                        disabled={isLoading}
                        className={cn(
                          "w-full rounded-lg border px-2.5 py-2 text-left transition-colors",
                          isCurrent
                            ? "border-primary/40 bg-primary/10"
                            : "border-border/60 bg-card hover:bg-muted/50"
                        )}
                        onClick={() => {
                          if (isCurrent) return;
                          clearError();
                          void openProjectByPath(project.path);
                        }}
                      >
                        <p className="truncate font-medium text-foreground">{project.name}</p>
                        <p
                          className="mt-0.5 truncate text-[11px] text-muted-foreground"
                          title={project.path}
                        >
                          {project.path}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground/80">
                          修改于 {formatModifiedAt(project.modifiedAt)}
                        </p>
                      </button>
                    </ContextMenuWrapper>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
