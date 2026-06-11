import { useState } from "react";
import { FolderOpen, FolderPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProjectStore } from "@/stores/projectStore";

export function ProjectPanel() {
  const current = useProjectStore((s) => s.current);
  const isLoading = useProjectStore((s) => s.isLoading);
  const error = useProjectStore((s) => s.error);
  const createProject = useProjectStore((s) => s.createProject);
  const openProjectByPicker = useProjectStore((s) => s.openProjectByPicker);
  const clearError = useProjectStore((s) => s.clearError);

  const [name, setName] = useState("演示项目");

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
          onChange={(e) => setName(e.target.value)}
          placeholder="演示项目"
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
    </div>
  );
}
