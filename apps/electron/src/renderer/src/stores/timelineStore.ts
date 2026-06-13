import { create } from "zustand";
import { debounce } from "@/lib/debounce";
import { modKeyLabel } from "@/lib/keyboard";
import { PR_SHORTCUTS } from "@/lib/premiereShortcuts";
import {
  canRedo,
  canUndo,
  createHistory,
  pushHistory,
  redoHistory,
  undoHistory,
  type TimelineHistory,
} from "@/lib/timeline/history";
import { alignClipHorizontalCenter } from "@/lib/timeline/alignClip";
import { findClipTrack, getClipRange } from "@/lib/timeline/clipCollision";
import {
  addClip,
  addTrack,
  addChildTrack,
  toggleGroupCollapsed,
  moveClip,
  removeClip,
  removeTrack,
  reorderTracks,
  renameTrack,
  resizeClip,
  splitClip,
  toggleMarkerAtFrame,
  toggleTrackLock,
  toggleTrackMuted,
  toggleTrackSolo,
  toggleTrackVisibility,
  updateClip,
  removeMarker,
} from "@/lib/timeline/mutations";
import type { ClipPatch } from "@/lib/timeline/mutations";
import { TimelineValidationError } from "@/lib/timeline/validate";
import { getEasyMotion } from "@/types/easyMotion";
import type {
  ApplyTimelineOptions,
  Clip,
  Timeline,
  TrackType,
} from "@/types/timeline";
import type { RemotionSyncStats } from "@/lib/remotion-sync";
import { placeAssetOnTimeline } from "@/lib/timeline/placeAssetClip";
import { findMarkerAtFrame, normalizeMarkers } from "@/lib/timeline/markers";
import { repairTimelineForEditing } from "@/lib/timeline/repair";
import {
  collectLayerElements,
  findLayerTrackForClip,
  findTrackById,
  pickDefaultContentElement,
} from "@/lib/timeline/trackTree";
import { useAssetStore } from "@/stores/assetStore";
import { useUiStore } from "@/stores/uiStore";

export interface RunGenerateOptions {
  /** 用户点击「生成预览」时为 true；编辑触发的自动生成为 false */
  manual?: boolean;
}

interface TimelineState {
  timeline: Timeline | null;
  isLoading: boolean;
  isSaving: boolean;
  isGenerating: boolean;
  error: string | null;
  currentFrame: number;
  selectedTrackId: string | null;
  selectedClipId: string | null;
  selectedMarkerId: string | null;
  hasUnsavedChanges: boolean;
  history: TimelineHistory;
  previewReloadNonce: number;
  /** 手写 Remotion：推送 timeline 到预览 iframe（独奏/可见性） */
  previewTimelineNonce: number;
  remotionDrift: {
    suggestSync: boolean;
    drifted: boolean;
    tracksEmpty: boolean;
    hasCustomRemotionCode: boolean;
    customRemotionReason: string | null;
  } | null;
  isSyncingRemotion: boolean;
  lastRemotionSync: RemotionSyncStats | null;

  loadTimeline: () => Promise<void>;
  applySampleTimeline: () => Promise<void>;
  checkRemotionDrift: (options?: { autoSync?: boolean }) => Promise<void>;
  syncFromRemotion: () => Promise<boolean>;
  saveTimeline: () => Promise<boolean>;
  runGenerate: (options?: RunGenerateOptions) => Promise<boolean>;
  scheduleGenerate: () => void;
  setCurrentFrame: (frame: number) => void;
  selectTrack: (trackId: string | null) => void;
  selectClip: (clipId: string | null) => void;
  clearSelection: () => void;
  clearError: () => void;
  clearHistory: () => void;

  applyTimelinePatch: (
    updater: (timeline: Timeline) => Timeline,
    options?: ApplyTimelineOptions,
  ) => void;

  addTrack: (type: TrackType, name?: string) => void;
  addChildTrack: (groupId: string, type: TrackType, name?: string) => void;
  toggleGroupCollapsed: (groupId: string) => void;
  removeTrack: (trackId: string) => void;
  confirmRemoveTrack: (trackId: string) => void;
  reorderTracks: (trackIdsInOrder: string[]) => void;
  toggleTrackVisibility: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  toggleTrackMuted: (trackId: string) => void;
  toggleTrackSolo: (trackId: string, exclusive?: boolean) => void;
  syncPreviewForTrackFilters: () => Promise<void>;
  /** 手写 Remotion：将时间线片段头尾等变更推送到预览 iframe */
  syncPreviewAfterTimelineEdit: () => Promise<boolean>;
  renameTrack: (trackId: string, name: string) => void;

  addClip: (trackId: string, clip: Clip) => void;
  removeClip: (trackId: string, clipId: string) => void;
  moveClip: (clipId: string, targetTrackId: string, newStartInFrames: number) => void;
  resizeClip: (
    clipId: string,
    edge: "left" | "right",
    newStartInFrames: number,
    newDurationInFrames: number,
  ) => void;
  splitClip: (clipId: string, splitFrame: number) => void;
  updateClip: (clipId: string, patch: ClipPatch) => void;
  splitSelectedClipAtPlayhead: () => void;
  deleteSelectedClip: () => void;
  alignSelectedClipHorizontalCenter: () => void;
  toggleMarkerAtPlayhead: () => void;
  selectMarker: (markerId: string | null) => void;
  removeSelectedMarker: () => void;
  placeAssetAtFrame: (
    assetId: string,
    startInFrames: number,
    trackId?: string | null,
  ) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const HISTORY_MERGE_MS = 500;

const debouncedGenerate = debounce(() => {
  void useTimelineStore.getState().runGenerate({ manual: false });
}, 500);

let historyMergeTimer: ReturnType<typeof setTimeout> | null = null;
let historyMerging = false;

function clearHistoryMerge() {
  if (historyMergeTimer) {
    clearTimeout(historyMergeTimer);
    historyMergeTimer = null;
  }
  historyMerging = false;
}

function scheduleHistoryMergeEnd() {
  if (historyMergeTimer) clearTimeout(historyMergeTimer);
  historyMergeTimer = setTimeout(() => {
    historyMerging = false;
    historyMergeTimer = null;
  }, HISTORY_MERGE_MS);
}

function syncSelectionAfterTimelineChange(
  timeline: Timeline,
  selectedClipId: string | null,
  selectedTrackId: string | null,
  selectedMarkerId: string | null,
): {
  selectedClipId: string | null;
  selectedTrackId: string | null;
  selectedMarkerId: string | null;
} {
  if (selectedClipId) {
    const exists = Boolean(findLayerTrackForClip(timeline, selectedClipId));
    if (!exists) {
      return { selectedClipId: null, selectedTrackId: null, selectedMarkerId };
    }
  }
  if (selectedTrackId) {
    const exists = timeline.tracks.some((t) => t.id === selectedTrackId);
    if (!exists) {
      return { selectedClipId, selectedTrackId: null, selectedMarkerId };
    }
  }
  if (selectedMarkerId) {
    const exists = normalizeMarkers(timeline.markers).some(
      (m) => m.id === selectedMarkerId,
    );
    if (!exists) {
      return { selectedClipId, selectedTrackId, selectedMarkerId: null };
    }
  }
  return { selectedClipId, selectedTrackId, selectedMarkerId };
}

export const useTimelineStore = create<TimelineState>((set, get) => {
  const commitTimeline = (
    next: Timeline,
    options: ApplyTimelineOptions = {},
  ) => {
    const {
      recordHistory = true,
      generate = "debounced",
      mergeHistory = generate === "debounced",
    } = options;
    const { timeline, selectedClipId, selectedTrackId, selectedMarkerId } = get();
    if (!timeline) return;

    let history = get().history;
    if (recordHistory) {
      if (mergeHistory && historyMerging) {
        // 合并窗口内：只更新 timeline，不重复入栈
      } else {
        history = pushHistory(history, timeline);
        if (mergeHistory) {
          historyMerging = true;
          scheduleHistoryMergeEnd();
        }
      }
    }

    const selection = syncSelectionAfterTimelineChange(
      next,
      selectedClipId,
      selectedTrackId,
      selectedMarkerId,
    );

    set({
      timeline: next,
      history,
      hasUnsavedChanges: true,
      error: null,
      ...selection,
    });

    if (generate === "debounced") {
      get().scheduleGenerate();
    } else if (generate === "immediate") {
      void get().runGenerate({ manual: false });
    }
  };

  const runMutation = (
    mutator: (timeline: Timeline) => Timeline,
    options?: ApplyTimelineOptions,
  ) => {
    const { timeline } = get();
    if (!timeline) {
      set({ error: "没有可编辑的时间线" });
      return;
    }
    try {
      const next = mutator(timeline);
      commitTimeline(next, options);
    } catch (err) {
      const message =
        err instanceof TimelineValidationError || err instanceof Error
          ? err.message
          : "时间线操作失败";
      set({ error: message });
    }
  };

  return {
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
    previewReloadNonce: 0,
    previewTimelineNonce: 0,
    remotionDrift: null,
    isSyncingRemotion: false,
    lastRemotionSync: null,

    clearError: () => set({ error: null }),

    clearHistory: () => {
      clearHistoryMerge();
      set({ history: createHistory() });
    },

    applyTimelinePatch: (updater, options) => {
      runMutation(updater, options);
    },

    setCurrentFrame: (frame) => {
      const { timeline } = get();
      const max = Math.max(0, (timeline?.durationInFrames ?? 1) - 1);
      set({ currentFrame: Math.min(max, Math.max(0, frame)) });
    },

    clearSelection: () => {
      set({ selectedTrackId: null, selectedClipId: null, selectedMarkerId: null });
    },

    selectTrack: (trackId) => {
      const { timeline } = get();
      if (!trackId) {
        set({ selectedTrackId: null, selectedClipId: null, selectedMarkerId: null });
        return;
      }

      if (!timeline) {
        set({ selectedTrackId: trackId, selectedClipId: null, selectedMarkerId: null });
        return;
      }

      const clicked = findTrackById(timeline, trackId);
      const layerTrack =
        timeline.tracks.find(
          (t) =>
            t.id === trackId || t.children?.some((child) => child.id === trackId),
        ) ?? clicked;

      if (!layerTrack) {
        set({ selectedTrackId: trackId, selectedClipId: null, selectedMarkerId: null });
        return;
      }

      // 点子轨道行：直接选中该轨道上的片段
      if (clicked && clicked.id !== layerTrack.id && clicked.clips.length > 0) {
        useUiStore.getState().setRightTab("properties");
        set({
          selectedTrackId: layerTrack.id,
          selectedClipId: clicked.clips[0]!.id,
          selectedMarkerId: null,
        });
        return;
      }

      const defaultElement = pickDefaultContentElement(
        collectLayerElements(layerTrack),
      );

      useUiStore.getState().setRightTab("properties");
      set({
        selectedTrackId: layerTrack.id,
        selectedClipId: defaultElement?.clip.id ?? clicked?.clips[0]?.id ?? null,
        selectedMarkerId: null,
      });
    },

    selectClip: (clipId) => {
      if (!clipId) {
        set({ selectedClipId: null });
        return;
      }
      const { timeline } = get();
      const located = timeline
        ? findLayerTrackForClip(timeline, clipId)
        : null;
      set({
        selectedClipId: clipId,
        selectedTrackId: located?.layerTrack.id ?? null,
        selectedMarkerId: null,
      });
      useUiStore.getState().setRightTab("properties");
    },

    selectMarker: (markerId) => {
      set({
        selectedMarkerId: markerId,
        selectedClipId: null,
        selectedTrackId: null,
      });
    },

    toggleMarkerAtPlayhead: () => {
      const { timeline, currentFrame } = get();
      if (!timeline) {
        set({ error: "没有可编辑的时间线" });
        return;
      }
      const hadMarker = Boolean(findMarkerAtFrame(timeline, currentFrame, 0));
      runMutation((t) => toggleMarkerAtFrame(t, currentFrame), {
        generate: "none",
      });
      const next = get().timeline;
      if (!next) return;
      if (hadMarker) {
        set({ selectedMarkerId: null });
        return;
      }
      const added = findMarkerAtFrame(next, currentFrame, 0);
      set({ selectedMarkerId: added?.id ?? null });
    },

    removeSelectedMarker: () => {
      const { timeline, selectedMarkerId } = get();
      if (!timeline || !selectedMarkerId) return;
      runMutation((t) => removeMarker(t, selectedMarkerId), { generate: "none" });
      set({ selectedMarkerId: null });
    },

    saveTimeline: async () => {
      const { timeline } = get();
      const api = getEasyMotion();
      if (!timeline || !api?.timeline.save) {
        set({ error: "没有可保存的时间线或未打开项目" });
        return false;
      }

      set({ isSaving: true, error: null });
      const res = await api.timeline.save({ timeline });
      set({ isSaving: false });

      if (!res.success) {
        set({ error: res.error?.message ?? "保存时间线失败" });
        return false;
      }

      if (res.data) {
        set({ timeline: res.data, hasUnsavedChanges: false });
      } else {
        set({ hasUnsavedChanges: false });
      }
      return true;
    },

    runGenerate: async (options = {}) => {
      const manual = options.manual ?? false;
      const api = getEasyMotion();
      if (!api?.timeline.generate) {
        set({ error: "生成 API 不可用" });
        return false;
      }

      await get().checkRemotionDrift({ autoSync: false });
      const drift = get().remotionDrift;
      if (drift?.hasCustomRemotionCode) {
        if (!manual) {
          const saved = await get().saveTimeline();
          if (!saved) return false;
          return get().syncPreviewAfterTimelineEdit();
        }
        const reason = drift.customRemotionReason ?? "手写 Remotion 代码";
        const proceed = window.confirm(
          `检测到手写 Remotion 项目（${reason}）。\n\n「生成预览」会用时间线 JSON 覆盖 MainSequence.tsx，可能破坏自定义动画。\n\n建议只使用「从 Remotion 读取」同步时间线。\n\n仍要继续生成吗？`,
        );
        if (!proceed) return false;
      }

      const saved = await get().saveTimeline();
      if (!saved) return false;

      set({ isGenerating: true, error: null });
      const res = await api.timeline.generate();
      set({ isGenerating: false });

      if (!res.success) {
        set({ error: res.error?.message ?? "生成 Remotion 代码失败" });
        return false;
      }

      if (res.data?.previewReload) {
        set((s) => ({ previewReloadNonce: s.previewReloadNonce + 1 }));
      } else if (api.preview?.getState) {
        const previewState = await api.preview.getState();
        if (previewState.success && previewState.data?.status === "running") {
          set((s) => ({ previewReloadNonce: s.previewReloadNonce + 1 }));
        }
      }

      return true;
    },

    scheduleGenerate: () => {
      debouncedGenerate();
    },

    loadTimeline: async () => {
      const api = getEasyMotion();
      if (!api?.timeline.load) {
        set({ error: "时间线 API 不可用（请在 Electron 中运行）" });
        return;
      }

      set({ isLoading: true, error: null });
      const res = await api.timeline.load();

      if (!res.success || !res.data) {
        set({
          isLoading: false,
          error: res.error?.message ?? "加载时间线失败（请先打开项目）",
        });
        return;
      }

      clearHistoryMerge();
      useUiStore.getState().setTimelineScrollX(0);

      const { timeline: loaded, repaired } = repairTimelineForEditing(res.data);

      set({
        timeline: loaded,
        currentFrame: 0,
        selectedClipId: null,
        selectedTrackId: null,
        selectedMarkerId: null,
        hasUnsavedChanges: repaired,
        history: createHistory(),
      });
      await get().checkRemotionDrift({ autoSync: true });
      set({ isLoading: false });
    },

    checkRemotionDrift: async (options) => {
      const autoSync = options?.autoSync ?? false;
      const api = getEasyMotion();
      if (!api?.timeline.checkRemotionDrift) return;

      const res = await api.timeline.checkRemotionDrift();
      if (!res.success || !res.data) {
        set({ remotionDrift: null });
        return;
      }

      const driftInfo = {
        suggestSync: res.data.suggestSync,
        drifted: res.data.drifted,
        tracksEmpty: res.data.tracksEmpty,
        hasCustomRemotionCode: Boolean(res.data.hasCustomRemotionCode),
        customRemotionReason: res.data.customRemotionReason ?? null,
      };

      set({ remotionDrift: driftInfo });

      if (!driftInfo.suggestSync) {
        return;
      }

      if (autoSync && !get().isSyncingRemotion) {
        await get().syncFromRemotion();
        return;
      }
    },

    syncFromRemotion: async () => {
      const api = getEasyMotion();
      if (!api?.timeline.syncFromRemotion) {
        set({ error: "Remotion 读取 API 不可用" });
        return false;
      }

      set({ isSyncingRemotion: true, isLoading: true, error: null, lastRemotionSync: null });
      const res = await api.timeline.syncFromRemotion();
      set({ isSyncingRemotion: false, isLoading: false });

      if (!res.success || !res.data) {
        set({ error: res.error?.message ?? "从 Remotion 读取失败" });
        return false;
      }

      clearHistoryMerge();
      useUiStore.getState().setTimelineScrollX(0);
      useUiStore.getState().requestTimelineFit();
      set({
        timeline: res.data.timeline,
        currentFrame: 0,
        selectedClipId: null,
        selectedTrackId: null,
        hasUnsavedChanges: false,
        history: createHistory(),
        remotionDrift: null,
        lastRemotionSync: res.data.stats,
      });
      await get().checkRemotionDrift({ autoSync: false });

      const stats = res.data.stats as {
        trackCount?: number;
        compositionResolved?: boolean;
        compositionError?: string | null;
        bundlerUsed?: boolean;
      };
      if (
        stats.bundlerUsed &&
        stats.compositionError &&
        !stats.trackCount
      ) {
        set({
          error: `从 Remotion 读取失败：${stats.compositionError}`,
        });
      } else if (
        stats.bundlerUsed &&
        stats.compositionError &&
        (stats.trackCount ?? 0) > 0
      ) {
        set({
          error: `轨道已导入（${stats.trackCount} 条），但 Remotion bundle 元数据读取失败：${stats.compositionError}`,
        });
      }

      return true;
    },

    applySampleTimeline: async () => {
      const api = getEasyMotion();
      if (!api?.timeline.applySample) {
        set({ error: "时间线 API 不可用" });
        return;
      }

      set({ isLoading: true, error: null });
      const res = await api.timeline.applySample();
      set({ isLoading: false });

      if (!res.success || !res.data) {
        set({ error: res.error?.message ?? "写入示例时间线失败" });
        return;
      }

      clearHistoryMerge();
      useUiStore.getState().setTimelineScrollX(0);
      set({
        timeline: res.data,
        currentFrame: 0,
        selectedClipId: null,
        selectedTrackId: null,
        hasUnsavedChanges: false,
        history: createHistory(),
      });

      await get().runGenerate({ manual: true });
    },

    addTrack: (type, name) => {
      runMutation((t) => addTrack(t, type, name), { generate: "immediate" });
    },

    addChildTrack: (groupId, type, name) => {
      runMutation((t) => addChildTrack(t, groupId, type, name), {
        generate: "immediate",
      });
    },

    toggleGroupCollapsed: (groupId) => {
      runMutation((t) => toggleGroupCollapsed(t, groupId), { generate: "none" });
    },

    removeTrack: (trackId) => {
      runMutation((t) => removeTrack(t, trackId), { generate: "immediate" });
    },

    confirmRemoveTrack: (trackId) => {
      const { timeline } = get();
      if (!timeline) return;
      const track = findTrackById(timeline, trackId);
      if (!track) return;

      const clipCount =
        track.type === "group"
          ? (track.children ?? []).reduce((n, c) => n + c.clips.length, 0)
          : track.clips.length;

      if (clipCount > 0) {
        const ok = window.confirm(
          `轨道「${track.name}」包含 ${clipCount} 个片段。确定删除？（可用 ${modKeyLabel()}+Z 撤销）`,
        );
        if (!ok) return;
      }

      get().removeTrack(trackId);
    },

    reorderTracks: (trackIdsInOrder) => {
      runMutation((t) => reorderTracks(t, trackIdsInOrder), {
        generate: "debounced",
      });
    },

    toggleTrackVisibility: (trackId) => {
      runMutation((t) => toggleTrackVisibility(t, trackId), {
        generate: "none",
      });
      void get().syncPreviewForTrackFilters();
    },

    toggleTrackLock: (trackId) => {
      runMutation((t) => toggleTrackLock(t, trackId), { generate: "none" });
    },

    toggleTrackMuted: (trackId) => {
      runMutation((t) => toggleTrackMuted(t, trackId), { generate: "none" });
    },

    toggleTrackSolo: (trackId, exclusive = false) => {
      runMutation((t) => toggleTrackSolo(t, trackId, exclusive), {
        generate: "none",
      });
      void get().syncPreviewForTrackFilters();
    },

    syncPreviewAfterTimelineEdit: async () => {
      const { timeline, remotionDrift } = get();
      const api = getEasyMotion();
      if (!timeline || !api?.timeline?.syncPreviewManifest) return false;
      if (!remotionDrift?.hasCustomRemotionCode) return false;

      const res = await api.timeline.syncPreviewManifest({ timeline });
      if (!res.success) return false;

      if (res.data?.timeline) {
        set({
          timeline: res.data.timeline,
          hasUnsavedChanges: false,
        });
      }
      if (res.data?.previewReload) {
        set((s) => ({ previewReloadNonce: s.previewReloadNonce + 1 }));
      } else if (res.data?.timelinePush !== false) {
        set((s) => ({ previewTimelineNonce: s.previewTimelineNonce + 1 }));
      }
      return true;
    },

    syncPreviewForTrackFilters: async () => {
      const { remotionDrift } = get();
      if (remotionDrift?.hasCustomRemotionCode) {
        await get().syncPreviewAfterTimelineEdit();
        return;
      }

      await get().runGenerate({ manual: false });
    },

    renameTrack: (trackId, name) => {
      runMutation((t) => renameTrack(t, trackId, name), { generate: "none" });
    },

    addClip: (trackId, clip) => {
      runMutation((t) => addClip(t, trackId, clip), { generate: "immediate" });
    },

    placeAssetAtFrame: (assetId, startInFrames, trackId) => {
      const asset = useAssetStore.getState().getAssetById(assetId);
      if (!asset) {
        set({ error: "素材不存在，请重新导入" });
        return;
      }

      const { timeline, currentFrame } = get();
      if (!timeline) {
        set({ error: "没有可编辑的时间线" });
        return;
      }

      const ui = useUiStore.getState();
      try {
        const result = placeAssetOnTimeline(timeline, asset, {
          startInFrames,
          trackId,
          snap: {
            timeline,
            pxPerFrame: ui.pxPerFrame,
            currentFrame,
            snapEnabled: ui.snapEnabled,
            altKeyHeld: ui.altKeyHeld,
          },
        });
        commitTimeline(result.timeline, { generate: "immediate" });
        set({
          selectedClipId: result.clipId,
          selectedTrackId: result.trackId,
        });
        useUiStore.getState().setRightTab("properties");
      } catch (err) {
        const message =
          err instanceof TimelineValidationError || err instanceof Error
            ? err.message
            : "无法放置素材";
        set({ error: message });
      }
    },

    removeClip: (trackId, clipId) => {
      runMutation((t) => removeClip(t, trackId, clipId), {
        generate: "immediate",
      });
    },

    moveClip: (clipId, targetTrackId, newStartInFrames) => {
      runMutation((t) => moveClip(t, clipId, targetTrackId, newStartInFrames), {
        generate: "debounced",
      });
    },

    resizeClip: (clipId, edge, newStartInFrames, newDurationInFrames) => {
      runMutation(
        (t) => resizeClip(t, clipId, edge, newStartInFrames, newDurationInFrames),
        { generate: "debounced" },
      );
    },

    splitClip: (clipId, splitFrame) => {
      runMutation((t) => splitClip(t, clipId, splitFrame), {
        generate: "immediate",
      });
    },

    updateClip: (clipId, patch) => {
      runMutation((t) => updateClip(t, clipId, patch), {
        generate: "debounced",
      });
    },

    splitSelectedClipAtPlayhead: () => {
      const { timeline, selectedClipId, currentFrame } = get();
      if (!timeline || !selectedClipId) {
        set({ error: "请先选中要分割的片段" });
        return;
      }
      const located = findClipTrack(timeline, selectedClipId);
      if (!located) return;
      if (located.track.locked) {
        set({ error: "轨道已锁定" });
        return;
      }
      const range = getClipRange(located.clip);
      if (currentFrame <= range.start || currentFrame >= range.end) {
        set({
          error: `请将播放头移到片段内部再分割（${PR_SHORTCUTS.addEdit}）`,
        });
        return;
      }
      get().splitClip(selectedClipId, currentFrame);
    },

    deleteSelectedClip: () => {
      const { timeline, selectedClipId } = get();
      if (!timeline || !selectedClipId) return;

      const located = findLayerTrackForClip(timeline, selectedClipId);
      if (!located) return;

      const parentLocked = located.layerTrack.locked;
      if (located.clipTrack.locked || parentLocked) {
        set({ error: "轨道已锁定" });
        return;
      }
      get().removeClip(located.clipTrack.id, selectedClipId);
    },

    alignSelectedClipHorizontalCenter: () => {
      const { selectedClipId } = get();
      if (!selectedClipId) {
        set({ error: "请先选中一个片段" });
        return;
      }
      runMutation((t) => alignClipHorizontalCenter(t, selectedClipId), {
        generate: "debounced",
      });
    },

    canUndo: () => canUndo(get().history),

    canRedo: () => canRedo(get().history),

    undo: () => {
      clearHistoryMerge();
      const { timeline, history } = get();
      if (!timeline) return;
      const result = undoHistory(history, timeline);
      if (!result) return;
      const selection = syncSelectionAfterTimelineChange(
        result.timeline,
        get().selectedClipId,
        get().selectedTrackId,
        get().selectedMarkerId,
      );
      set({
        history: result.history,
        timeline: result.timeline,
        hasUnsavedChanges: true,
        ...selection,
      });
      void get().runGenerate({ manual: false });
    },

    redo: () => {
      clearHistoryMerge();
      const { timeline, history } = get();
      if (!timeline) return;
      const result = redoHistory(history, timeline);
      if (!result) return;
      const selection = syncSelectionAfterTimelineChange(
        result.timeline,
        get().selectedClipId,
        get().selectedTrackId,
        get().selectedMarkerId,
      );
      set({
        history: result.history,
        timeline: result.timeline,
        hasUnsavedChanges: true,
        ...selection,
      });
      void get().runGenerate({ manual: false });
    },
  };
});
