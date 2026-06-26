import { useCallback, useEffect, useState } from "react";
import { WindowControls } from "@/components/shell/WindowControls";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores/projectStore";
import { getEasyMotion, type WindowState } from "@/types/easyMotion";

const DRAG_REGION = { WebkitAppRegion: "drag" } as React.CSSProperties;

export function TitleBar() {
  const shell = getEasyMotion()?.shell;
  const windowApi = getEasyMotion()?.window;
  const projectName = useProjectStore((s) => s.current?.name);
  const [windowState, setWindowState] = useState<WindowState>({
    maximized: false,
    fullscreen: false,
  });

  useEffect(() => {
    if (!windowApi) return;

    void windowApi.getState().then((result) => {
      if (result.success && result.data) {
        setWindowState(result.data);
      }
    });

    return windowApi.onStateChanged((state) => {
      setWindowState(state);
    });
  }, [windowApi]);

  const onToggleMaximize = useCallback(() => {
    void windowApi?.toggleMaximize().then((result) => {
      if (result.success && result.data) {
        setWindowState(result.data);
      }
    });
  }, [windowApi]);

  const onDoubleClickDrag = useCallback(() => {
    onToggleMaximize();
  }, [onToggleMaximize]);

  const showWindowControls =
    shell?.customWindowControls && !windowState.fullscreen;

  return (
    <header
      className={cn(
        "z-50 flex h-8 shrink-0 items-stretch overflow-hidden border-b border-border bg-card select-none",
        shell?.trafficLightInset && "pl-[4.5rem]",
      )}
    >
      <div
        className="flex min-w-0 flex-1 items-center"
        style={DRAG_REGION}
        onDoubleClick={onDoubleClickDrag}
      >
        <div
          className="flex shrink-0 items-center gap-2 pl-3"
          style={{ WebkitAppRegion: "no-drag" }}
        >
          <span
            className="flex h-4 w-4 items-center justify-center rounded-sm bg-primary/15 text-[10px] font-semibold text-foreground/90"
            aria-hidden
          >
            E
          </span>
          <span className="text-xs font-medium text-foreground/80">
            EasyMotion
          </span>
        </div>
        {projectName ? (
          <span className="min-w-0 max-w-[40%] truncate px-2 text-xs text-muted-foreground">
            {projectName}
          </span>
        ) : null}
      </div>
      {showWindowControls ? (
        <WindowControls
          maximized={windowState.maximized}
          onMinimize={() => void windowApi?.minimize()}
          onToggleMaximize={onToggleMaximize}
          onClose={() => void windowApi?.close()}
        />
      ) : null}
    </header>
  );
}
