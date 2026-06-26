import { useEffect } from "react";
import { ExportDialogs } from "@/components/export/ExportDialogs";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTimelineShortcuts } from "@/hooks/useTimelineShortcuts";
import { useAssetStore } from "@/stores/assetStore";
import { useConversationStore } from "@/stores/conversationStore";
import { useExportStore } from "@/stores/exportStore";
import { useProjectStore } from "@/stores/projectStore";
import { useTimelineStore } from "@/stores/timelineStore";

export default function App() {
  useTimelineShortcuts();

  useEffect(() => {
    const unsubscribeExport = useExportStore.getState().subscribeIpc();
    return unsubscribeExport;
  }, []);

  useEffect(() => {
    useTimelineStore.getState().subscribeToEventBus();

    void (async () => {
      await useProjectStore.getState().refreshCurrent();
      if (useProjectStore.getState().current) {
        await Promise.all([
          useTimelineStore.getState().loadTimeline(),
          useAssetStore.getState().loadAssets(),
          useConversationStore.getState().loadConversation(),
        ]);
      } else {
        useAssetStore.getState().clear();
        useConversationStore.getState().resetForProjectClose();
      }
    })();
  }, []);

  return (
    <>
      <AppLayout />
      <ExportDialogs />
    </>
  );
}
