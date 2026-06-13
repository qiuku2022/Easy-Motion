import { useCallback, useRef } from "react";
import { PanelResizer } from "@/components/layout/PanelResizer";
import { TopToolbar } from "@/components/layout/TopToolbar";
import { LeftPanel } from "@/components/layout/LeftPanel";
import { RightPanel } from "@/components/layout/RightPanel";
import { PreviewWindow } from "@/components/preview/PreviewWindow";
import { TimelinePanel } from "@/components/timeline/TimelinePanel";
import { usePreviewColumnWidth } from "@/hooks/usePreviewAspectFit";
import { useUiStore } from "@/stores/uiStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { cn } from "@/lib/utils";

const LEFT_MIN = 200;
const LEFT_MAX = 480;
const RIGHT_MIN = 240;
const RIGHT_MAX = 520;
const TIMELINE_MIN = 150;
const TIMELINE_MAX = 350;
const DEFAULT_ASPECT_RATIO = 16 / 9;

export function AppLayout() {
  const rowRef = useRef<HTMLDivElement>(null);
  const timeline = useTimelineStore((s) => s.timeline);
  const aspectRatio =
    timeline?.width && timeline?.height
      ? timeline.width / timeline.height
      : DEFAULT_ASPECT_RATIO;
  const previewColumnWidth = usePreviewColumnWidth(rowRef, aspectRatio);

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

  const bothSidesCollapsed = leftCollapsed && rightCollapsed;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopToolbar />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div ref={rowRef} className="flex min-h-0 flex-1 overflow-hidden">
          {!leftCollapsed && (
            <>
              <div
                style={{
                  flex: `1 1 ${leftPanelWidth}px`,
                  minWidth: LEFT_MIN,
                  maxWidth: LEFT_MAX,
                }}
                className="min-w-0 overflow-hidden"
              >
                <LeftPanel />
              </div>
              <PanelResizer axis="horizontal" onResize={onResizeLeft} />
            </>
          )}
          <main
            style={
              bothSidesCollapsed
                ? undefined
                : { width: previewColumnWidth, flexShrink: 0 }
            }
            className={cn(
              "flex min-h-0 min-w-0 flex-col overflow-hidden",
              bothSidesCollapsed && "flex-1",
            )}
          >
            <PreviewWindow />
          </main>
          {!rightCollapsed && (
            <>
              <PanelResizer axis="horizontal" onResize={onResizeRight} />
              <div
                style={{
                  flex: `1 1 ${rightPanelWidth}px`,
                  minWidth: RIGHT_MIN,
                  maxWidth: RIGHT_MAX,
                }}
                className="min-w-0 overflow-hidden"
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
