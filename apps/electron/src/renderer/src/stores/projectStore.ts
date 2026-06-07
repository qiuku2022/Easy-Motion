import { create } from "zustand";
import { getEasyMotion } from "@/types/easyMotion";
import { useTimelineStore } from "@/stores/timelineStore";
import { useAssetStore } from "@/stores/assetStore";

export interface CurrentProject {
  name: string;
  path: string;
}

interface ProjectState {
  current: CurrentProject | null;
  isLoading: boolean;
  error: string | null;

  refreshCurrent: () => Promise<void>;
  createProject: (name: string, parentPath?: string) => Promise<boolean>;
  openProjectByPicker: () => Promise<boolean>;
  saveProject: () => Promise<boolean>;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  current: null,
  isLoading: false,
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

    await useProjectStore.getState().refreshCurrent();
    await Promise.all([
      useTimelineStore.getState().loadTimeline(),
      useAssetStore.getState().loadAssets(),
    ]);
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

    set({ isLoading: true, error: null });
    const res = await api.project.open(picked.data.path);
    set({ isLoading: false });

    if (!res.success) {
      set({ error: res.error?.message ?? "打开项目失败" });
      return false;
    }

    await useProjectStore.getState().refreshCurrent();
    await Promise.all([
      useTimelineStore.getState().loadTimeline(),
      useAssetStore.getState().loadAssets(),
    ]);
    return true;
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

    return true;
  },
}));
