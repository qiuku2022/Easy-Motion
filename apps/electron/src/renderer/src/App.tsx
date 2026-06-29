import { useEffect } from "react";
import { ExportDialogs } from "@/components/export/ExportDialogs";
import { AppShell } from "@/components/shell/AppShell";
import { useTimelineShortcuts } from "@/hooks/useTimelineShortcuts";
import { useAssetStore } from "@/stores/assetStore";
import { useConversationStore } from "@/stores/conversationStore";
import { useExportStore } from "@/stores/exportStore";
import { useProjectStore } from "@/stores/projectStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { hydrateProjectWorkspace } from "@/lib/workspace/projectWorkspace";

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
        await hydrateProjectWorkspace();
      } else {
        useAssetStore.getState().clear();
        useConversationStore.getState().resetForProjectClose();
      }
    })();
  }, []);

  return (
    <>
      <AppShell />
      <ExportDialogs />
    </>
  );
}
