import { create } from "zustand";
import type { ProjectAsset } from "@/types/asset";
import { getEasyMotion } from "@/types/easyMotion";

interface AssetState {
  assets: ProjectAsset[];
  isLoading: boolean;
  isImporting: boolean;
  error: string | null;

  clear: () => void;
  clearError: () => void;
  getAssetById: (id: string) => ProjectAsset | undefined;
  loadAssets: () => Promise<void>;
  importFilePaths: (paths: string[]) => Promise<boolean>;
  pickAndImport: () => Promise<boolean>;
}

export const useAssetStore = create<AssetState>((set, get) => ({
  assets: [],
  isLoading: false,
  isImporting: false,
  error: null,

  clear: () => set({ assets: [], error: null }),

  clearError: () => set({ error: null }),

  getAssetById: (id) => get().assets.find((a) => a.id === id),

  loadAssets: async () => {
    const api = getEasyMotion();
    if (!api?.asset?.list) {
      set({ assets: [] });
      return;
    }

    set({ isLoading: true, error: null });
    const res = await api.asset.list();
    set({ isLoading: false });

    if (!res.success) {
      set({ error: res.error?.message ?? "加载素材失败", assets: [] });
      return;
    }

    set({ assets: res.data ?? [], error: null });
  },

  importFilePaths: async (paths) => {
    const api = getEasyMotion();
    if (!api?.asset?.importFiles) {
      set({ error: "素材 API 不可用" });
      return false;
    }

    const filtered = paths.filter(Boolean);
    if (filtered.length === 0) return false;

    set({ isImporting: true, error: null });
    const res = await api.asset.importFiles({ filePaths: filtered });
    set({ isImporting: false });

    if (!res.success) {
      set({ error: res.error?.message ?? "导入失败" });
      return false;
    }

    const data = res.data;
    set({ assets: data?.assets ?? get().assets });

    if (data?.errors?.length) {
      const first = data.errors[0];
      set({
        error: data.imported?.length
          ? `部分文件导入失败：${first.message}`
          : first.message,
      });
    }

    return Boolean(data?.imported?.length);
  },

  pickAndImport: async () => {
    const api = getEasyMotion();
    if (!api?.asset?.pickAndImport) {
      set({ error: "素材 API 不可用" });
      return false;
    }

    set({ isImporting: true, error: null });
    const res = await api.asset.pickAndImport();
    set({ isImporting: false });

    if (!res.success) {
      set({ error: res.error?.message ?? "导入失败" });
      return false;
    }

    const data = res.data;
    if (data?.assets) {
      set({ assets: data.assets });
    }

    if (data?.errors?.length && !data?.imported?.length) {
      set({ error: data.errors[0].message });
      return false;
    }

    return Boolean(data?.imported?.length);
  },
}));
