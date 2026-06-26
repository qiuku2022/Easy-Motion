import { create } from "zustand";
import type { ProjectSummary } from "@/types/easyMotion";
import { getEasyMotion } from "@/types/easyMotion";
import { createHistory } from "@/lib/timeline/history";
import { useTimelineStore } from "@/stores/timelineStore";
import { useAssetStore } from "@/stores/assetStore";
import { useConversationStore } from "@/stores/conversationStore";
import { useExportStore } from "@/stores/exportStore";
import { usePlaybackStore } from "@/stores/playbackStore";

export interface CurrentProject {
  name: string;
  path: string;
}

interface ProjectState {
  current: CurrentProject | null;
  localProjects: ProjectSummary[];
  localScanRoot: string | null;
  isLoading: boolean;
  isLoadingLocal: boolean;
  error: string | null;

  refreshCurrent: () => Promise<void>;
  loadLocalProjects: () => Promise<void>;
  createProject: (name: string, parentPath?: string) => Promise<boolean>;
  openProjectByPicker: () => Promise<boolean>;
  openProjectByPath: (path: string) => Promise<boolean>;
  saveProject: () => Promise<boolean>;
  closeProject: () => Promise<boolean>;
  deleteProject: (path: string) => Promise<boolean>;
  clearError: () => void;
}

async function reloadProjectWorkspace() {
  await Promise.all([
    useTimelineStore.getState().loadTimeline(),
    useAssetStore.getState().loadAssets(),
    useConversationStore.getState().loadConversation(),
  ]);
}

async function clearProjectWorkspace() {
  const api = getEasyMotion();
  if (api?.preview?.stop) {
    await api.preview.stop();
  }

  useTimelineStore.setState({
    timeline: null,
    isLoading: false,
    isSaving: false,
    isGenerating: false,
    error: null,
    currentFrame: 0,
    selectedTrackId: null,
    selectedClipId: null,
    selectedMarkerId: null,
    hasUnsavedChanges: false,
    history: createHistory(),
    remotionDrift: null,
    isSyncingRemotion: false,
    lastRemotionSync: null,
  });
  useAssetStore.getState().clear();
  useConversationStore.getState().resetForProjectClose();
  usePlaybackStore.getState().setPlaying(false);
  if (useExportStore.getState().phase !== "exporting") {
    useExportStore.getState().reset();
  }
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  current: null,
  localProjects: [],
  localScanRoot: null,
  isLoading: false,
  isLoadingLocal: false,
  error: null,

  clearError: () => set({ error: null }),

  refreshCurrent: async () => {
    const api = getEasyMotion();
    if (!api?.project.getCurrent) return;

    const res = await api.project.getCurrent();
    if (!res.success || !res.data) {
      set({ current: null });
      return;
    }

    set({
      current: {
        name: res.data.data.name,
        path: res.data.path,
      },
      error: null,
    });
  },

  loadLocalProjects: async () => {
    const api = getEasyMotion();
    if (!api?.project.listLocal) return;

    set({ isLoadingLocal: true });
    const res = await api.project.listLocal();
    set({ isLoadingLocal: false });

    if (!res.success || !res.data) {
      set({ error: res.error?.message ?? "加载项目列表失败" });
      return;
    }

    set({
      localProjects: res.data.projects,
      localScanRoot: res.data.scanRoot,
      error: null,
    });
  },

  openProjectByPath: async (projectPath) => {
    const api = getEasyMotion();
    if (!api?.project.open) {
      set({ error: "项目 API 不可用" });
      return false;
    }

    set({ isLoading: true, error: null });
    const res = await api.project.open(projectPath);
    set({ isLoading: false });

    if (!res.success) {
      set({ error: res.error?.message ?? "打开项目失败" });
      return false;
    }

    await get().refreshCurrent();
    await reloadProjectWorkspace();
    await get().loadLocalProjects();
    return true;
  },

  createProject: async (name, parentPath) => {
    const api = getEasyMotion();
    if (!api?.project.create) {
      set({ error: "项目 API 不可用" });
      return false;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      set({ error: "请输入项目名称" });
      return false;
    }

    set({ isLoading: true, error: null });
    const res = await api.project.create({ name: trimmed, parentPath });
    set({ isLoading: false });

    if (!res.success) {
      set({ error: res.error?.message ?? "创建项目失败" });
      return false;
    }

    await get().refreshCurrent();
    await reloadProjectWorkspace();
    await get().loadLocalProjects();
    return true;
  },

  openProjectByPicker: async () => {
    const api = getEasyMotion();
    if (!api?.project.pickProjectDirectory) {
      set({ error: "项目 API 不可用" });
      return false;
    }

    const picked = await api.project.pickProjectDirectory();
    if (!picked.success || !picked.data?.path) {
      return false;
    }

    return get().openProjectByPath(picked.data.path);
  },

  saveProject: async () => {
    const api = getEasyMotion();
    if (!api?.project.save) {
      set({ error: "项目 API 不可用" });
      return false;
    }

    const timelineSaved = await useTimelineStore.getState().saveTimeline();
    if (!timelineSaved) return false;

    set({ isLoading: true, error: null });
    const res = await api.project.save();
    set({ isLoading: false });

    if (!res.success) {
      set({ error: res.error?.message ?? "保存项目失败" });
      return false;
    }

    await get().loadLocalProjects();
    return true;
  },

  closeProject: async () => {
    const api = getEasyMotion();
    if (!get().current) return true;

    if (!api?.project.close) {
      set({ error: "项目 API 不可用" });
      return false;
    }

    if (useTimelineStore.getState().hasUnsavedChanges) {
      const confirmed = window.confirm(
        "当前项目有未保存的更改。\n关闭项目将丢弃这些更改，是否继续？",
      );
      if (!confirmed) return false;
    }

    set({ isLoading: true, error: null });
    const res = await api.project.close();
    set({ isLoading: false });

    if (!res.success) {
      set({ error: res.error?.message ?? "关闭项目失败" });
      return false;
    }

    await clearProjectWorkspace();
    await get().refreshCurrent();
    await get().loadLocalProjects();
    return true;
  },

  deleteProject: async (projectPath) => {
    const api = getEasyMotion();
    if (!api?.project.delete) {
      set({ error: "项目 API 不可用" });
      return false;
    }

    const confirmed = window.confirm(
      `确认删除项目？\n${projectPath}\n\n此操作不可恢复。`,
    );
    if (!confirmed) return false;

    const wasCurrent = get().current?.path === projectPath;

    set({ isLoading: true, error: null });
    const res = await api.project.delete(projectPath);
    set({ isLoading: false });

    if (!res.success) {
      set({ error: res.error?.message ?? "删除项目失败" });
      return false;
    }

    if (wasCurrent) {
      const api = getEasyMotion();
      if (api?.project.close) {
        await api.project.close();
      }
      await clearProjectWorkspace();
    }

    await get().refreshCurrent();
    await get().loadLocalProjects();
    return true;
  },
}));
