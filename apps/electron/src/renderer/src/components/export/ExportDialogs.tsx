import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Archive,
  Clapperboard,
  FolderOpen,
  Info,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExportStore } from "@/stores/exportStore";
import { useProjectStore } from "@/stores/projectStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { resolveExportFrameRange } from "@/lib/timeline/workArea";
import { cn } from "@/lib/utils";
import type {
  ExportFormat,
  ExportKind,
  ExportQuality,
  ExportResolution,
} from "@/types/export";
import { getEasyMotion } from "@/types/easyMotion";
import { toast } from "sonner";

function defaultOutputName(projectName: string, format: ExportFormat) {
  const safe = projectName.replace(/[^\w\u4e00-\u9fa5-]+/g, "_").slice(0, 48);
  const ext = format === "webm" ? "webm" : "mp4";
  return `${safe || "export"}.${ext}`;
}

function defaultZipName(projectName: string) {
  const safe = projectName.replace(/[^\w\u4e00-\u9fa5-]+/g, "_").slice(0, 48);
  return `${safe || "export"}-remotion.zip`;
}

function statusTitle(
  phase: string,
  progressStatus?: string,
  exportKind: ExportKind = "video",
): string {
  if (phase === "failed") return exportKind === "project" ? "工程导出失败" : "导出失败";
  if (phase === "cancelled") return "已取消";
  if (phase === "completed") return exportKind === "project" ? "工程导出完成" : "导出完成";
  if (progressStatus === "preparing") {
    return exportKind === "project" ? "准备打包…" : "准备渲染…";
  }
  if (progressStatus === "encoding") {
    return exportKind === "project" ? "正在打包…" : "正在编码…";
  }
  if (progressStatus === "rendering") return "正在渲染…";
  if (phase === "exporting") {
    return exportKind === "project" ? "正在导出工程…" : "正在导出…";
  }
  return "导出";
}

export function ExportDialogs() {
  const dialogOpen = useExportStore((s) => s.dialogOpen);
  const progressOpen = useExportStore((s) => s.progressOpen);
  const phase = useExportStore((s) => s.phase);
  const progress = useExportStore((s) => s.progress);
  const outputPath = useExportStore((s) => s.outputPath);
  const error = useExportStore((s) => s.error);
  const exportKind = useExportStore((s) => s.exportKind);
  const closeDialog = useExportStore((s) => s.closeDialog);
  const openDialog = useExportStore((s) => s.openDialog);
  const startExport = useExportStore((s) => s.startExport);
  const startProjectExport = useExportStore((s) => s.startProjectExport);
  const cancelExport = useExportStore((s) => s.cancelExport);
  const reset = useExportStore((s) => s.reset);

  const [mode, setMode] = useState<ExportKind>("video");
  const project = useProjectStore((s) => s.current);
  const timeline = useTimelineStore((s) => s.timeline);
  const exportRange = useMemo(
    () => (timeline ? resolveExportFrameRange(timeline) : null),
    [timeline],
  );

  const [format, setFormat] = useState<ExportFormat>("mp4");
  const [resolution, setResolution] = useState<ExportResolution>("1080p");
  const [quality, setQuality] = useState<ExportQuality>("medium");
  const [output, setOutput] = useState("");
  const [starting, setStarting] = useState(false);

  const defaultPath = useMemo(() => {
    if (!project?.path) return "";
    const sep = project.path.includes("\\") ? "\\" : "/";
    return `${project.path}${sep}output${sep}${defaultOutputName(project.name, format)}`;
  }, [project?.name, project?.path, format]);

  const defaultZipPath = useMemo(() => {
    if (!project?.path) return "";
    const sep = project.path.includes("\\") ? "\\" : "/";
    return `${project.path}${sep}output${sep}${defaultZipName(project.name)}`;
  }, [project?.name, project?.path]);

  useEffect(() => {
    if (dialogOpen) {
      setOutput(mode === "project" ? defaultZipPath : defaultPath);
    }
  }, [dialogOpen, defaultPath, defaultZipPath, mode]);

  const pickOutput = async () => {
    const api = getEasyMotion()?.export;
    if (mode === "project") {
      if (!api?.pickProjectOutput) return;
      const res = await api.pickProjectOutput({
        defaultPath: output || defaultZipPath,
      });
      if (res.success && res.data?.path) setOutput(res.data.path);
      return;
    }
    if (!api?.pickOutput) return;
    const res = await api.pickOutput({
      defaultPath: output || defaultPath,
      format,
    });
    if (res.success && res.data?.path) setOutput(res.data.path);
  };

  const onConfirmExport = async () => {
    if (!output.trim()) {
      toast.error("请选择输出路径");
      return;
    }
    setStarting(true);
    const ok =
      mode === "project"
        ? await startProjectExport({ outputZipPath: output.trim() })
        : await startExport({
            format,
            resolution,
            quality,
            outputPath: output.trim(),
          });
    setStarting(false);
    if (!ok && useExportStore.getState().error) {
      toast.error(mode === "project" ? "工程导出失败" : "导出失败", {
        description: useExportStore.getState().error ?? undefined,
      });
    }
  };

  const percentage = Math.max(0, Math.min(100, progress?.percentage ?? 0));
  const isActive = phase === "exporting";
  const isFailed = phase === "failed";
  const title = statusTitle(phase, progress?.status, exportKind);
  const canCancel = isActive && exportKind === "video";

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[480px]">
          <DialogHeader className="space-y-1 border-b border-border px-5 py-4">
            <DialogTitle>导出</DialogTitle>
            <DialogDescription>
              渲染视频或打包 Remotion 工程，供分享与二次编辑。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-5 py-4">
            <ExportModePicker mode={mode} onChange={setMode} />

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              {mode === "video" ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="格式">
                      <Select
                        value={format}
                        onValueChange={(v) => setFormat(v as ExportFormat)}
                      >
                        <SelectTrigger className="h-9 w-full bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mp4">MP4</SelectItem>
                          <SelectItem value="webm">WEBM</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="分辨率">
                      <Select
                        value={resolution}
                        onValueChange={(v) => setResolution(v as ExportResolution)}
                      >
                        <SelectTrigger className="h-9 w-full bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="original">原始</SelectItem>
                          <SelectItem value="1080p">1080p</SelectItem>
                          <SelectItem value="720p">720p</SelectItem>
                          <SelectItem value="480p">480p</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="质量">
                      <Select
                        value={quality}
                        onValueChange={(v) => setQuality(v as ExportQuality)}
                      >
                        <SelectTrigger className="h-9 w-full bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">高</SelectItem>
                          <SelectItem value="medium">中</SelectItem>
                          <SelectItem value="low">低</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  {exportRange ? (
                    <InfoNote>
                      导出帧 {exportRange.inFrame}–{exportRange.outFrame}，共{" "}
                      {exportRange.frameCount} 帧
                      {exportRange.custom
                        ? "（已设 I/O）"
                        : "（至最后有内容的帧）"}
                    </InfoNote>
                  ) : null}

                  <InfoNote>视频渲染需要本机安装 Google Chrome。</InfoNote>
                </div>
              ) : (
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p className="text-foreground">将当前子项目打包为独立 ZIP：</p>
                  <ul className="space-y-1.5 text-xs leading-relaxed">
                    <ProjectFeature>Remotion 源码与 timeline manifest</ProjectFeature>
                    <ProjectFeature>public 静态资源与项目素材</ProjectFeature>
                    <ProjectFeature>解压后 npm install && npm run start</ProjectFeature>
                  </ul>
                  <InfoNote>不含 node_modules；缺失引用素材时会阻止导出。</InfoNote>
                </div>
              )}
            </div>

            <Field label="输出路径">
              <div className="flex gap-2">
                <Input
                  className="h-9 font-mono text-xs"
                  value={output}
                  onChange={(e) => setOutput(e.target.value)}
                  placeholder={mode === "project" ? "选择 .zip 保存位置" : "选择视频保存位置"}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 px-3"
                  onClick={() => void pickOutput()}
                >
                  浏览
                </Button>
              </div>
            </Field>
          </div>

          <DialogFooter className="mx-0 mb-0 gap-3 border-t border-border bg-muted/10 px-5 py-4 sm:justify-end">
            <Button type="button" variant="ghost" onClick={closeDialog}>
              取消
            </Button>
            <Button
              type="button"
              disabled={starting || !project}
              onClick={() => void onConfirmExport()}
            >
              {starting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  启动中…
                </>
              ) : mode === "project" ? (
                "开始打包"
              ) : (
                "开始导出"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={progressOpen}
        onOpenChange={(open) => {
          if (!open && !isActive) reset();
        }}
      >
        <DialogContent
          className="gap-0 overflow-hidden p-0 sm:max-w-[440px]"
          showCloseButton={!isActive}
        >
          <DialogHeader className="space-y-2 border-b border-border px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              {isFailed ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : isActive ? (
                <Loader2 className="h-4 w-4 animate-spin text-foreground" />
              ) : null}
              {title}
            </DialogTitle>
            <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2">
              <p className="break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
                {outputPath ?? output}
              </p>
            </div>
          </DialogHeader>

          <div className="space-y-3 px-5 py-4">
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-foreground/80 transition-[width] duration-300 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {exportKind === "project"
                  ? isActive
                    ? "打包中…"
                    : phase === "completed"
                      ? "ZIP 已生成"
                      : "—"
                  : progress && progress.totalFrames > 0
                    ? `${progress.currentFrame} / ${progress.totalFrames} 帧`
                    : isActive
                      ? "初始化…"
                      : "—"}
              </span>
              <span className="tabular-nums text-foreground">{percentage}%</span>
            </div>

            {progress &&
            progress.estimatedRemainingSeconds > 0 &&
            isActive &&
            exportKind === "video" ? (
              <p className="text-center text-xs text-muted-foreground">
                预计剩余约 {progress.estimatedRemainingSeconds} 秒
              </p>
            ) : null}

            {error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            ) : null}
          </div>

          <DialogFooter className="mx-0 mb-0 gap-3 border-t border-border bg-muted/10 px-5 py-4 sm:justify-end">
            {canCancel ? (
              <Button type="button" variant="outline" onClick={() => void cancelExport()}>
                取消渲染
              </Button>
            ) : isActive ? (
              <p className="mr-auto text-xs text-muted-foreground">工程打包中，请稍候…</p>
            ) : null}
            {!isActive && isFailed ? (
              <>
                <Button type="button" variant="ghost" onClick={reset}>
                  关闭
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    reset();
                    openDialog();
                  }}
                >
                  重新设置
                </Button>
              </>
            ) : !isActive && phase === "completed" ? (
              <>
                <Button type="button" variant="ghost" onClick={reset}>
                  关闭
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    toast.success(exportKind === "project" ? "工程导出完成" : "导出完成", {
                      description: outputPath ?? undefined,
                    });
                    reset();
                  }}
                >
                  <FolderOpen className="mr-1.5 h-4 w-4" />
                  完成
                </Button>
              </>
            ) : !isActive ? (
              <Button type="button" variant="ghost" onClick={reset}>
                关闭
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ExportModePicker({
  mode,
  onChange,
}: {
  mode: ExportKind;
  onChange: (mode: ExportKind) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <ModeCard
        active={mode === "video"}
        icon={Clapperboard}
        title="导出视频"
        description="MP4 / WEBM"
        onClick={() => onChange("video")}
      />
      <ModeCard
        active={mode === "project"}
        icon={Archive}
        title="Remotion 工程"
        description="ZIP 源码包"
        onClick={() => onChange("project")}
      />
    </div>
  );
}

function ModeCard({
  active,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: typeof Clapperboard;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors",
        active
          ? "border-foreground/20 bg-background shadow-sm ring-1 ring-foreground/10"
          : "border-border bg-muted/15 text-muted-foreground hover:border-foreground/15 hover:bg-muted/30 hover:text-foreground",
      )}
    >
      <Icon className={cn("h-4 w-4", active ? "text-foreground" : "text-muted-foreground")} />
      <span className={cn("text-sm font-medium", active && "text-foreground")}>{title}</span>
      <span className="text-[11px]">{description}</span>
    </button>
  );
}

function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-md border border-border/80 bg-background/40 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" />
      <span>{children}</span>
    </div>
  );
}

function ProjectFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/70" />
      <span>{children}</span>
    </li>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
