import { useEffect } from "react";
import { ExportDialogs } from "@/components/export/ExportDialogs";
import { AppShell } from "@/components/shell/AppShell";
import { useTimelineShortcuts } from "@/hooks/useTimelineShortcuts";
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
  }, []);

  useEffect(() => {
    void useProjectStore.getState().initializeWorkspace();
  }, []);

  return (
    <>
      <AppShell />
      <ExportDialogs />
    </>
  );
}
