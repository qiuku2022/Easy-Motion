import { create } from "zustand";
import type { ProjectSummary } from "@/types/easyMotion";
import { getEasyMotion } from "@/types/easyMotion";
import { createHistory } from "@/lib/timeline/history";
import { useTimelineStore } from "@/stores/timelineStore";
import { useAssetStore } from "@/stores/assetStore";
import { useConversationStore } from "@/stores/conversationStore";
import { useExportStore } from "@/stores/exportStore";
import { usePlaybackStore } from "@/stores/playbackStore";
import {
  flushProjectWorkspace,
  hydrateProjectWorkspace,
  resetProjectWorkspaceRuntime,
} from "@/lib/workspace/projectWorkspace";

export interface CurrentProject {
  name: string;
  path: string;
}

interface ProjectState {
  current: CurrentProject | null;
  localProjects: ProjectSummary[];
  localScanRoot: string | null;
  isLoading: boolean;
  /** 打开/创建/关闭/启动恢复项目时的全屏过渡 */
  isProjectTransitioning: boolean;
  isLoadingLocal: boolean;
  error: string | null;

  refreshCurrent: () => Promise<void>;
  initializeWorkspace: () => Promise<void>;
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
  await useTimelineStore.getState().loadTimeline();
  await hydrateProjectWorkspace();
  await Promise.all([
    useAssetStore.getState().loadAssets(),
    useConversationStore.getState().loadConversation(),
  ]);
}

function resetWorkspaceForTransition() {
  useTimelineStore.setState({
    timeline: null,
    isLoading: true,
    isSaving: false,
    isGenerating: false,
    error: null,
    currentFrame: 0,
    selectedTrackId: null,
    selectedClipId: null,
    selectedMarkerId: null,
    hasUnsavedChanges: false,
    remotionDrift: null,
    isSyncingRemotion: false,
    lastRemotionSync: null,
  });
  useAssetStore.getState().clear();
  useConversationStore.getState().resetForProjectClose();
  usePlaybackStore.getState().setPlaying(false);
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
  resetProjectWorkspaceRuntime();
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  current: null,
  localProjects: [],
  localScanRoot: null,
  isLoading: false,
  isProjectTransitioning: false,
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

  initializeWorkspace: async () => {
    set({ isProjectTransitioning: true, isLoading: true });
    try {
      await get().refreshCurrent();
      if (get().current) {
        await reloadProjectWorkspace();
      } else {
        useAssetStore.getState().clear();
        useConversationStore.getState().resetForProjectClose();
      }
    } finally {
      set({ isProjectTransitioning: false, isLoading: false });
    }
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

    if (get().current) {
      await flushProjectWorkspace();
    }

    set({ isProjectTransitioning: true, isLoading: true, error: null });
    resetWorkspaceForTransition();

    try {
      const res = await api.project.open(projectPath);
      if (!res.success) {
        useTimelineStore.setState({ isLoading: false });
        set({ error: res.error?.message ?? "打开项目失败" });
        return false;
      }

      await get().refreshCurrent();
      await reloadProjectWorkspace();
      await get().loadLocalProjects();
      return true;
    } finally {
      set({ isProjectTransitioning: false, isLoading: false });
    }
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

    if (get().current) {
      await flushProjectWorkspace();
    }

    set({ isProjectTransitioning: true, isLoading: true, error: null });
    resetWorkspaceForTransition();

    try {
      const res = await api.project.create({ name: trimmed, parentPath });
      if (!res.success) {
        useTimelineStore.setState({ isLoading: false });
        set({ error: res.error?.message ?? "创建项目失败" });
        return false;
      }

      await get().refreshCurrent();
      await reloadProjectWorkspace();
      await get().loadLocalProjects();
      return true;
    } finally {
      set({ isProjectTransitioning: false, isLoading: false });
    }
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

    await flushProjectWorkspace();

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
        "当前项目有未保存的更改。\n关闭项目将丢弃这些更改，是否继续？"
      );
      if (!confirmed) return false;
    }

    await flushProjectWorkspace();

    set({ isProjectTransitioning: true, isLoading: true, error: null });

    try {
      const res = await api.project.close();
      if (!res.success) {
        set({ error: res.error?.message ?? "关闭项目失败" });
        return false;
      }

      await clearProjectWorkspace();
      await get().refreshCurrent();
      await get().loadLocalProjects();
      return true;
    } finally {
      set({ isProjectTransitioning: false, isLoading: false });
    }
  },

  deleteProject: async (projectPath) => {
    const api = getEasyMotion();
    if (!api?.project.delete) {
      set({ error: "项目 API 不可用" });
      return false;
    }

    const confirmed = window.confirm(
      `确认删除项目？\n${projectPath}\n\n此操作不可恢复。`
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
