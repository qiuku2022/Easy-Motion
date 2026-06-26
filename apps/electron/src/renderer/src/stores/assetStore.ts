import { create } from "zustand";
import type {
  AssetDuplicateInfo,
  AssetImportResult,
  AssetTypeFilter,
  DuplicateAction,
  DuplicateResolution,
  ProjectAsset,
} from "@/types/asset";
import { getEasyMotion } from "@/types/easyMotion";

interface AssetState {
  assets: ProjectAsset[];
  isLoading: boolean;
  isImporting: boolean;
  error: string | null;
  searchQuery: string;
  typeFilter: AssetTypeFilter;
  pendingDuplicates: AssetDuplicateInfo[];
  pendingImportPaths: string[];

  clear: () => void;
  clearError: () => void;
  setSearchQuery: (query: string) => void;
  setTypeFilter: (filter: AssetTypeFilter) => void;
  clearPendingDuplicates: () => void;
  getAssetById: (id: string) => ProjectAsset | undefined;
  loadAssets: () => Promise<void>;
  importFilePaths: (
    paths: string[],
    duplicateResolutions?: Record<string, DuplicateResolution>,
  ) => Promise<"ok" | "needs_resolution" | "failed">;
  pickAndImport: (
    duplicateResolutions?: Record<string, DuplicateResolution>,
  ) => Promise<"ok" | "needs_resolution" | "failed">;
  resolveDuplicateImport: (
    resolutions: Record<string, DuplicateResolution>,
  ) => Promise<boolean>;
  toggleFavorite: (assetId: string) => Promise<void>;
  recordUsage: (assetId: string) => Promise<void>;
}

function applyImportResult(
  set: (partial: Partial<AssetState>) => void,
  get: () => AssetState,
  data: AssetImportResult | undefined,
): "ok" | "needs_resolution" | "failed" {
  if (!data) {
    set({ error: "导入失败" });
    return "failed";
  }

  if (data.needsDuplicateResolution && data.duplicates?.length) {
    set({
      pendingDuplicates: data.duplicates,
      pendingImportPaths: data.pendingFilePaths ?? get().pendingImportPaths,
      assets: data.assets ?? get().assets,
    });
    return "needs_resolution";
  }

  set({
    assets: data.assets ?? get().assets,
    pendingDuplicates: [],
    pendingImportPaths: [],
  });

  if (data.errors?.length) {
    const first = data.errors[0];
    set({
      error: data.imported?.length
        ? `部分文件导入失败：${first.message}`
        : first.message,
    });
  }

  if (!data.imported?.length && data.errors?.length) {
    return "failed";
  }

  return "ok";
}

export const useAssetStore = create<AssetState>((set, get) => ({
  assets: [],
  isLoading: false,
  isImporting: false,
  error: null,
  searchQuery: "",
  typeFilter: "all",
  pendingDuplicates: [],
  pendingImportPaths: [],

  clear: () =>
    set({
      assets: [],
      error: null,
      searchQuery: "",
      typeFilter: "all",
      pendingDuplicates: [],
      pendingImportPaths: [],
    }),

  clearError: () => set({ error: null }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setTypeFilter: (typeFilter) => set({ typeFilter }),

  clearPendingDuplicates: () =>
    set({ pendingDuplicates: [], pendingImportPaths: [] }),

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

  importFilePaths: async (paths, duplicateResolutions) => {
    const api = getEasyMotion();
    if (!api?.asset?.importFiles) {
      set({ error: "素材 API 不可用" });
      return "failed";
    }

    const filtered = paths.filter(Boolean);
    if (filtered.length === 0) return "failed";

    set({ isImporting: true, error: null });
    if (!duplicateResolutions) {
      set({ pendingImportPaths: filtered });
    }
    const res = await api.asset.importFiles({
      filePaths: filtered,
      duplicateResolutions,
    });
    set({ isImporting: false });

    if (!res.success) {
      set({ error: res.error?.message ?? "导入失败" });
      return "failed";
    }

    return applyImportResult(set, get, res.data);
  },

  pickAndImport: async (duplicateResolutions) => {
    const api = getEasyMotion();
    if (!api?.asset?.pickAndImport) {
      set({ error: "素材 API 不可用" });
      return "failed";
    }

    set({ isImporting: true, error: null });
    const res = await api.asset.pickAndImport({ duplicateResolutions });
    set({ isImporting: false });

    if (!res.success) {
      set({ error: res.error?.message ?? "导入失败" });
      return "failed";
    }

    const data = res.data;
    if (data?.needsDuplicateResolution && data.pendingFilePaths?.length) {
      set({ pendingImportPaths: data.pendingFilePaths });
    }

    return applyImportResult(set, get, data);
  },

  resolveDuplicateImport: async (resolutions) => {
    const paths = get().pendingImportPaths;
    if (!paths.length) return false;
    const result = await get().importFilePaths(paths, resolutions);
    return result === "ok";
  },

  toggleFavorite: async (assetId) => {
    const api = getEasyMotion();
    const asset = get().getAssetById(assetId);
    if (!api?.asset?.updateMeta || !asset) return;

    const res = await api.asset.updateMeta({
      assetId,
      isFavorite: !asset.isFavorite,
    });
    if (!res.success || !res.data) return;

    set({
      assets: get().assets.map((a) => (a.id === assetId ? res.data! : a)),
    });
  },

  recordUsage: async (assetId) => {
    const api = getEasyMotion();
    if (!api?.asset?.recordUsage) return;

    const res = await api.asset.recordUsage({ assetId });
    if (!res.success || !res.data) return;

    set({
      assets: get().assets.map((a) => (a.id === assetId ? res.data! : a)),
    });
  },
}));

export function filterAssets(
  assets: ProjectAsset[],
  searchQuery: string,
  typeFilter: AssetTypeFilter,
): ProjectAsset[] {
  const q = searchQuery.trim().toLowerCase();
  return assets.filter((asset) => {
    if (typeFilter !== "all" && asset.type !== typeFilter) return false;
    if (!q) return true;
    return (
      asset.name.toLowerCase().includes(q) ||
      asset.originalName.toLowerCase().includes(q) ||
      asset.type.toLowerCase().includes(q)
    );
  });
}

export function groupAssetsByType(assets: ProjectAsset[]) {
  const groups: Record<"image" | "video" | "audio", ProjectAsset[]> = {
    image: [],
    video: [],
    audio: [],
  };
  for (const asset of assets) {
    groups[asset.type].push(asset);
  }
  return groups;
}

export function favoriteAssets(assets: ProjectAsset[]) {
  return assets.filter((a) => a.isFavorite);
}

export function recentAssets(assets: ProjectAsset[], limit = 12) {
  return [...assets]
    .filter((a) => a.lastUsedAt)
    .sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0))
    .slice(0, limit);
}

export const DUPLICATE_ACTION_LABELS: Record<DuplicateAction, string> = {
  skip: "跳过",
  rename: "重命名",
  overwrite: "覆盖",
};
