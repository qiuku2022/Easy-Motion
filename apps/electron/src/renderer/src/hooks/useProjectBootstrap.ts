import { useMemo } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useTimelineStore } from "@/stores/timelineStore";

/** 项目打开/切换/关闭时的全屏过渡状态 */
export function useProjectBootstrap() {
  const isProjectTransitioning = useProjectStore((s) => s.isProjectTransitioning);
  const timelineLoading = useTimelineStore((s) => s.isLoading);
  const isGenerating = useTimelineStore((s) => s.isGenerating);
  const isSyncingRemotion = useTimelineStore((s) => s.isSyncingRemotion);

  const message = useMemo(() => {
    if (isSyncingRemotion) return "正在从 Remotion 同步时间线…";
    if (isGenerating) return "正在生成 Remotion 代码…";
    if (timelineLoading) return "正在加载时间线…";
    return "正在打开项目…";
  }, [isGenerating, isSyncingRemotion, timelineLoading]);

  return {
    isBootstrapping: isProjectTransitioning,
    message,
  };
}
