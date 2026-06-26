import { create } from "zustand";
import type {
  ExportCompletedPayload,
  ExportErrorPayload,
  ExportFormat,
  ExportKind,
  ExportProgressPayload,
  ExportQuality,
  ExportResolution,
} from "@/types/export";
import { getEasyMotion } from "@/types/easyMotion";
import { useProjectStore } from "@/stores/projectStore";
import { useTimelineStore } from "@/stores/timelineStore";

export type ExportPhase =
  | "idle"
  | "configuring"
  | "exporting"
  | "completed"
  | "failed"
  | "cancelled";

interface ExportState {
  phase: ExportPhase;
  exportKind: ExportKind;
  exportId: string | null;
  progress: ExportProgressPayload | null;
  outputPath: string | null;
  error: string | null;
  dialogOpen: boolean;
  progressOpen: boolean;

  openDialog: () => void;
  closeDialog: () => void;
  startExport: (options: {
    format: ExportFormat;
    resolution: ExportResolution;
    quality: ExportQuality;
    outputPath: string;
  }) => Promise<boolean>;
  startProjectExport: (options: { outputZipPath: string }) => Promise<boolean>;
  cancelExport: () => Promise<void>;
  reset: () => void;
  subscribeIpc: () => () => void;
}

let ipcSubscribed = false;

async function ensureTimelineSaved(): Promise<boolean> {
  const timelineStore = useTimelineStore.getState();
  if (!timelineStore.hasUnsavedChanges) return true;
  return timelineStore.saveTimeline();
}

export const useExportStore = create<ExportState>((set, get) => ({
  phase: "idle",
  exportKind: "video",
  exportId: null,
  progress: null,
  outputPath: null,
  error: null,
  dialogOpen: false,
  progressOpen: false,

  openDialog: () => set({ dialogOpen: true, phase: "configuring" }),

  closeDialog: () => {
    if (get().phase === "exporting") return;
    set({ dialogOpen: false, phase: "idle" });
  },

  reset: () =>
    set({
      phase: "idle",
      exportKind: "video",
      exportId: null,
      progress: null,
      outputPath: null,
      error: null,
      dialogOpen: false,
      progressOpen: false,
    }),

  startExport: async (options) => {
    const api = getEasyMotion()?.export;
    const project = useProjectStore.getState().current;
    if (!api?.start || !project?.path) {
      set({ error: "未打开项目", phase: "failed" });
      return false;
    }

    if (!(await ensureTimelineSaved())) {
      set({ error: "请先保存时间线", phase: "failed" });
      return false;
    }

    set({
      phase: "exporting",
      exportKind: "video",
      dialogOpen: false,
      progressOpen: true,
      error: null,
      progress: null,
      outputPath: options.outputPath,
    });

    const res = await api.start({
      projectPath: project.path,
      format: options.format,
      resolution: options.resolution,
      quality: options.quality,
      outputPath: options.outputPath,
    });

    if (!res.success || !res.data?.exportId) {
      set({
        phase: "failed",
        error: res.error?.message ?? "启动导出失败",
        progressOpen: true,
      });
      return false;
    }

    set({ exportId: res.data.exportId });
    return true;
  },

  startProjectExport: async (options) => {
    const api = getEasyMotion()?.export;
    const project = useProjectStore.getState().current;
    if (!api?.project || !project?.path) {
      set({ error: "未打开项目", phase: "failed" });
      return false;
    }

    if (!(await ensureTimelineSaved())) {
      set({ error: "请先保存时间线", phase: "failed" });
      return false;
    }

    set({
      phase: "exporting",
      exportKind: "project",
      dialogOpen: false,
      progressOpen: true,
      error: null,
      progress: null,
      outputPath: options.outputZipPath,
    });

    const res = await api.project({
      projectPath: project.path,
      outputZipPath: options.outputZipPath,
      includeAssets: true,
    });

    if (!res.success || !res.data?.exportId) {
      set({
        phase: "failed",
        error: res.error?.message ?? "启动工程导出失败",
        progressOpen: true,
      });
      return false;
    }

    set({ exportId: res.data.exportId });
    return true;
  },

  cancelExport: async () => {
    const { exportId, exportKind } = get();
    const api = getEasyMotion()?.export;
    if (exportId && api?.cancel && exportKind === "video") {
      await api.cancel(exportId);
    }
    set({ phase: "cancelled", progressOpen: false });
    get().reset();
  },

  subscribeIpc: () => {
    if (ipcSubscribed) return () => {};
    ipcSubscribed = true;

    const api = getEasyMotion()?.export;
    if (!api) return () => {};

    const offProgress = api.onProgress((payload: ExportProgressPayload) => {
      const { exportId } = get();
      if (exportId && payload.exportId !== exportId) return;
      set({ progress: payload });
      if (payload.status === "completed") {
        set({ phase: "completed" });
      }
    });

    const offCompleted = api.onCompleted((payload: ExportCompletedPayload) => {
      const { exportId } = get();
      if (exportId && payload.exportId !== exportId) return;
      set({
        phase: "completed",
        outputPath: payload.outputPath,
        progressOpen: true,
      });
    });

    const offError = api.onError((payload: ExportErrorPayload) => {
      const { exportId } = get();
      if (exportId && payload.exportId !== exportId) return;
      const cancelled =
        payload.message.includes("E2602") || payload.message.includes("已取消");
      set({
        phase: cancelled ? "cancelled" : "failed",
        error: payload.message,
        progressOpen: true,
      });
      if (cancelled) {
        setTimeout(() => get().reset(), 400);
      }
    });

    return () => {
      ipcSubscribed = false;
      offProgress();
      offCompleted();
      offError();
    };
  },
}));
