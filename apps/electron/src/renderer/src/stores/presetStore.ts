import { create } from "zustand";
import manifest from "@/data/presets/manifest.json";
import categories from "@/data/presets/categories.json";
import type {
  PresetCategory,
  PresetCategoryMeta,
  PresetDefinition,
} from "@/types/preset";

interface PresetState {
  presets: PresetDefinition[];
  categories: PresetCategoryMeta[];
  activeCategory: PresetCategory;
  searchQuery: string;
  pendingPreset: PresetDefinition | null;
  applyDialogOpen: boolean;

  setActiveCategory: (category: PresetCategory) => void;
  setSearchQuery: (query: string) => void;
  getFilteredPresets: () => PresetDefinition[];
  getPresetById: (id: string) => PresetDefinition | undefined;
  openApplyDialog: (preset: PresetDefinition) => void;
  closeApplyDialog: () => void;
}

export const usePresetStore = create<PresetState>((set, get) => ({
  presets: manifest as PresetDefinition[],
  categories: categories as PresetCategoryMeta[],
  activeCategory: "all",
  searchQuery: "",
  pendingPreset: null,
  applyDialogOpen: false,

  setActiveCategory: (activeCategory) => set({ activeCategory }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  getFilteredPresets: () => {
    const { presets, activeCategory, searchQuery } = get();
    const q = searchQuery.trim().toLowerCase();
    return presets.filter((preset) => {
      if (activeCategory !== "all" && preset.category !== activeCategory) {
        return false;
      }
      if (!q) return true;
      return (
        preset.name.toLowerCase().includes(q) ||
        preset.description.toLowerCase().includes(q) ||
        preset.id.toLowerCase().includes(q)
      );
    });
  },

  getPresetById: (id) => get().presets.find((p) => p.id === id),

  openApplyDialog: (preset) =>
    set({ pendingPreset: preset, applyDialogOpen: true }),

  closeApplyDialog: () =>
    set({ pendingPreset: null, applyDialogOpen: false }),
}));
