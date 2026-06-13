import { useCallback } from "react";
import { PanelResizer } from "@/components/layout/PanelResizer";
import { TopToolbar } from "@/components/layout/TopToolbar";
import { LeftPanel } from "@/components/layout/LeftPanel";
import { RightPanel } from "@/components/layout/RightPanel";
import { PreviewWindow } from "@/components/preview/PreviewWindow";
import { TimelinePanel } from "@/components/timeline/TimelinePanel";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";

const LEFT_MIN = 160;
const LEFT_MAX = 350;
const RIGHT_MIN = 200;
const RIGHT_MAX = 400;
const TIMELINE_MIN = 150;
const TIMELINE_MAX = 350;

export function AppLayout() {
  const {
    leftPanelWidth,
    rightPanelWidth,
    timelineHeight,
    leftCollapsed,
    rightCollapsed,
    timelineCollapsed,
    setLeftPanelWidth,
    setRightPanelWidth,
    setTimelineHeight,
  } = useUiStore();

  const onResizeLeft = useCallback(
    (delta: number) => {
      setLeftPanelWidth(Math.min(LEFT_MAX, Math.max(LEFT_MIN, leftPanelWidth + delta)));
    },
    [leftPanelWidth, setLeftPanelWidth]
  );

  const onResizeRight = useCallback(
    (delta: number) => {
      setRightPanelWidth(
        Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, rightPanelWidth - delta))
      );
    },
    [rightPanelWidth, setRightPanelWidth]
  );

  const onResizeTimeline = useCallback(
    (delta: number) => {
      setTimelineHeight(
        Math.min(TIMELINE_MAX, Math.max(TIMELINE_MIN, timelineHeight - delta))
      );
    },
    [timelineHeight, setTimelineHeight]
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopToolbar />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {!leftCollapsed && (
            <>
              <div
                style={{ width: leftPanelWidth }}
                className="shrink-0 overflow-hidden"
              >
                <LeftPanel />
              </div>
              <PanelResizer axis="horizontal" onResize={onResizeLeft} />
            </>
          )}
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <PreviewWindow />
          </main>
          {!rightCollapsed && (
            <>
              <PanelResizer axis="horizontal" onResize={onResizeRight} />
              <div
                style={{ width: rightPanelWidth }}
                className="shrink-0 overflow-hidden"
              >
                <RightPanel />
              </div>
            </>
          )}
        </div>
        {!timelineCollapsed && (
          <>
            <PanelResizer axis="vertical" onResize={onResizeTimeline} />
            <div
              style={{ height: timelineHeight }}
              className={cn("shrink-0 overflow-hidden")}
            >
              <TimelinePanel />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
