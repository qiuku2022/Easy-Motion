import type { Timeline } from "@/types/timeline";

export interface RemotionSyncStats {
  trackCount: number;
  clipCount: number;
  fingerprint: string;
  syncSource: string;
  compositionResolved: boolean;
  compositionError?: string | null;
  manifestUsed?: boolean;
}

const SYNC_SOURCE_LABELS: Record<string, string> = {
  native: "Remotion 官方 API（bundle + selectComposition）",
  manifest: "manifest 文件",
  ast: "源码结构解析（遗留项目）",
  "native+manifest": "官方 API + manifest",
  "native+ast": "官方 API + 源码解析",
  generate: "时间线生成",
};

export function formatRemotionSyncSource(syncSource?: Timeline["remotionSyncSource"]): string {
  if (!syncSource) return "未知";
  return SYNC_SOURCE_LABELS[syncSource] ?? syncSource;
}

export function formatRemotionSyncSummary(stats: RemotionSyncStats): string {
  const source = formatRemotionSyncSource(
    stats.syncSource as Timeline["remotionSyncSource"],
  );
  const meta = stats.compositionResolved
    ? "已读取 Composition 元数据"
    : stats.compositionError
      ? `元数据读取失败：${stats.compositionError}`
      : "未读取 Composition 元数据";
  return `${meta} · ${stats.trackCount} 轨 / ${stats.clipCount} 片段 · 来源：${source}`;
}
