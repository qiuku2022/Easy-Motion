import { getEasyMotion } from "@/types/easyMotion";
import { useUiStore } from "@/stores/uiStore";

const SAVE_DEBOUNCE_MS = 400;

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingKeyframePanelExpanded: boolean | null = null;

export async function hydrateProjectWorkspace(subprojectPath?: string) {
  const api = getEasyMotion();
  if (!api?.workspace?.load) {
    useUiStore.setState({ keyframePanelExpanded: false });
    return;
  }

  const res = await api.workspace.load(
    subprojectPath ? { subprojectPath } : undefined,
  );

  useUiStore.setState({
    keyframePanelExpanded: res.success
      ? Boolean(res.data?.timeline.keyframePanelExpanded)
      : false,
  });
  pendingKeyframePanelExpanded = null;
}

export function scheduleKeyframePanelSave(expanded: boolean) {
  pendingKeyframePanelExpanded = expanded;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void flushProjectWorkspace();
  }, SAVE_DEBOUNCE_MS);
}

export async function flushProjectWorkspace(subprojectPath?: string) {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }

  const api = getEasyMotion();
  if (!api?.workspace?.save) return;

  const expanded =
    pendingKeyframePanelExpanded ?? useUiStore.getState().keyframePanelExpanded;
  pendingKeyframePanelExpanded = null;

  await api.workspace.save({
    patch: { timeline: { keyframePanelExpanded: expanded } },
    ...(subprojectPath ? { subprojectPath } : {}),
  });
}

export function resetProjectWorkspaceRuntime() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  pendingKeyframePanelExpanded = null;
  useUiStore.setState({ keyframePanelExpanded: false });
}
