import { useState } from "react";
import { Menu } from "lucide-react";
import { toast } from "sonner";
import { LLMSettingsDialog } from "@/components/ai/LLMSettingsDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { PR_SHORTCUTS } from "@/lib/premiereShortcuts";
import { useExportStore } from "@/stores/exportStore";
import { useProjectStore } from "@/stores/projectStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useUiStore } from "@/stores/uiStore";
import { getEasyMotion } from "@/types/easyMotion";

export function AppMenu() {
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("演示项目");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [llmSettingsOpen, setLlmSettingsOpen] = useState(false);

  const isLoading = useProjectStore((s) => s.isLoading);
  const currentProject = useProjectStore((s) => s.current);
  const createProject = useProjectStore((s) => s.createProject);
  const openProjectByPicker = useProjectStore((s) => s.openProjectByPicker);
  const closeProject = useProjectStore((s) => s.closeProject);
  const saveProject = useProjectStore((s) => s.saveProject);
  const clearError = useProjectStore((s) => s.clearError);

  const openExportDialog = useExportStore((s) => s.openDialog);
  const exportPhase = useExportStore((s) => s.phase);

  const undo = useTimelineStore((s) => s.undo);
  const redo = useTimelineStore((s) => s.redo);
  const canUndo = useTimelineStore((s) => s.history.past.length > 0);
  const canRedo = useTimelineStore((s) => s.history.future.length > 0);
  const splitAtPlayhead = useTimelineStore((s) => s.splitSelectedClipAtPlayhead);
  const clearTimelineError = useTimelineStore((s) => s.clearError);

  const setLeftTab = useUiStore((s) => s.setLeftTab);
  const leftCollapsed = useUiStore((s) => s.leftCollapsed);
  const rightCollapsed = useUiStore((s) => s.rightCollapsed);
  const aiCollapsed = useUiStore((s) => s.aiCollapsed);
  const timelineCollapsed = useUiStore((s) => s.timelineCollapsed);
  const snapEnabled = useUiStore((s) => s.snapEnabled);
  const toggleLeftCollapsed = useUiStore((s) => s.toggleLeftCollapsed);
  const toggleRightCollapsed = useUiStore((s) => s.toggleRightCollapsed);
  const toggleAiCollapsed = useUiStore((s) => s.toggleAiCollapsed);
  const toggleTimelineCollapsed = useUiStore((s) => s.toggleTimelineCollapsed);
  const toggleSnapEnabled = useUiStore((s) => s.toggleSnapEnabled);
  const requestTimelineFit = useUiStore((s) => s.requestTimelineFit);

  const handleSave = async () => {
    const ok = await saveProject();
    if (ok) {
      toast.success("项目已保存");
      return;
    }
    const message = useProjectStore.getState().error;
    toast.error("保存失败", { description: message ?? undefined });
  };

  const handleCreateProject = async () => {
    clearError();
    const ok = await createProject(newProjectName);
    if (ok) {
      setNewProjectOpen(false);
      setLeftTab("project");
      toast.success("项目已创建");
      return;
    }
    const message = useProjectStore.getState().error;
    toast.error("创建失败", { description: message ?? undefined });
  };

  const handleCloseProject = async () => {
    clearError();
    const ok = await closeProject();
    if (ok) {
      setLeftTab("project");
      toast.success("已关闭项目");
      return;
    }
    const message = useProjectStore.getState().error;
    if (message) {
      toast.error("关闭失败", { description: message });
    }
  };

  const handleExport = () => {
    if (!currentProject) {
      toast.error("请先打开项目");
      return;
    }
    openExportDialog();
  };

  const handleSplit = () => {
    clearTimelineError();
    splitAtPlayhead();
  };

  const handleQuit = () => {
    void getEasyMotion()?.window?.close();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "h-8 w-8 cursor-pointer",
          )}
          aria-label="应用菜单"
        >
          <Menu className="h-4 w-4" />
          <span className="sr-only">菜单</span>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="z-[90] w-52">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>文件</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="z-[90] w-52">
              <DropdownMenuItem
                disabled={isLoading}
                onClick={() => {
                  clearError();
                  setNewProjectName("演示项目");
                  setNewProjectOpen(true);
                }}
              >
                新建项目…
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isLoading}
                onClick={() => {
                  clearError();
                  void openProjectByPicker();
                }}
              >
                打开项目…
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isLoading || !currentProject || exportPhase === "exporting"}
                onClick={() => void handleCloseProject()}
              >
                关闭项目
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isLoading || !currentProject}
                onClick={() => void handleSave()}
              >
                保存
                <DropdownMenuShortcut>{PR_SHORTCUTS.save}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!currentProject || exportPhase === "exporting"}
                onClick={handleExport}
              >
                导出…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleQuit}>退出</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>编辑</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="z-[90] w-52">
              <DropdownMenuItem disabled={!canUndo} onClick={undo}>
                撤销
                <DropdownMenuShortcut>{PR_SHORTCUTS.undo}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canRedo} onClick={redo}>
                重做
                <DropdownMenuShortcut>{PR_SHORTCUTS.redo}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSplit}>
                在播放头分割
                <DropdownMenuShortcut>{PR_SHORTCUTS.addEdit}</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>视图</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="z-[90] w-52">
              <DropdownMenuCheckboxItem
                checked={!leftCollapsed}
                onCheckedChange={() => toggleLeftCollapsed()}
              >
                左侧面板
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={!rightCollapsed}
                onCheckedChange={() => toggleRightCollapsed()}
              >
                属性面板
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={!aiCollapsed}
                onCheckedChange={() => toggleAiCollapsed()}
              >
                AI 助手
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={!timelineCollapsed}
                onCheckedChange={() => toggleTimelineCollapsed()}
              >
                时间线
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={snapEnabled}
                onCheckedChange={() => toggleSnapEnabled()}
              >
                吸附
                <DropdownMenuShortcut>{PR_SHORTCUTS.snapToggle}</DropdownMenuShortcut>
              </DropdownMenuCheckboxItem>
              <DropdownMenuItem onClick={() => requestTimelineFit()}>
                适配时间线缩放
                <DropdownMenuShortcut>{PR_SHORTCUTS.fitTimeline}</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>帮助</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="z-[90] w-52">
              <DropdownMenuItem onClick={() => setLlmSettingsOpen(true)}>
                AI 设置…
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAboutOpen(true)}>
                关于 EasyMotion
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新建项目</DialogTitle>
            <DialogDescription>
              项目将保存在默认项目目录下。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="app-menu-project-name" className="text-xs text-muted-foreground">
              项目名称
            </Label>
            <Input
              id="app-menu-project-name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isLoading) {
                  void handleCreateProject();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewProjectOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={isLoading || !newProjectName.trim()}
              onClick={() => void handleCreateProject()}
            >
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>EasyMotion</DialogTitle>
            <DialogDescription>
              用自然语言制作 Remotion 动画的桌面编辑器。
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            版本 {getEasyMotion()?.version ?? "—"}
          </p>
          <DialogFooter>
            <Button type="button" onClick={() => setAboutOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LLMSettingsDialog
        open={llmSettingsOpen}
        onOpenChange={setLlmSettingsOpen}
      />
    </>
  );
}
