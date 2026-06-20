import { useEffect } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { isInPreviewSyncCooldown, useTimelineStore } from "@/stores/timelineStore";

const DRIFT_POLL_MS = 4000;

/** 项目打开后定期检测 Remotion 源码漂移，并自动从 Remotion 读取时间线 */
export function useRemotionAutoSync() {
  const projectPath = useProjectStore((s) => s.current?.path);
  const checkRemotionDrift = useTimelineStore((s) => s.checkRemotionDrift);

  useEffect(() => {
    if (!projectPath) return;

    const tick = () => {
      const { isSyncingRemotion, isLoading, isGenerating, isSaving } =
        useTimelineStore.getState();
      if (
        isSyncingRemotion ||
        isLoading ||
        isGenerating ||
        isSaving ||
        isInPreviewSyncCooldown()
      ) {
        return;
      }
      void checkRemotionDrift({ autoSync: true });
    };

    const id = window.setInterval(tick, DRIFT_POLL_MS);
    return () => window.clearInterval(id);
  }, [projectPath, checkRemotionDrift]);
}
