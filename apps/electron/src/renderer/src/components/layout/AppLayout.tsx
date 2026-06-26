import { useCallback, useRef, useState, type CSSProperties } from "react";
import { AiPanel } from "@/components/layout/AiPanel";
import { PanelResizer } from "@/components/layout/PanelResizer";
import { LeftPanel } from "@/components/layout/LeftPanel";
import { RightPanel } from "@/components/layout/RightPanel";
import { PreviewWindow } from "@/components/preview/PreviewWindow";
import { TimelinePanel } from "@/components/timeline/TimelinePanel";
import {
  PREVIEW_DISPLAY_ASPECT,
  usePreviewColumnWidth,
} from "@/hooks/usePreviewAspectFit";
import { useRemotionAutoSync } from "@/hooks/useRemotionAutoSync";
import {
  useUiStore,
  LEFT_PANEL_WIDTH_MIN,
  LEFT_PANEL_WIDTH_MAX,
  RIGHT_PANEL_WIDTH_MIN,
  RIGHT_PANEL_WIDTH_MAX,
  AI_PANEL_WIDTH_MIN,
  AI_PANEL_WIDTH_MAX,
  TIMELINE_HEIGHT_MIN,
  TIMELINE_HEIGHT_MAX,
} from "@/stores/uiStore";

const LEFT_MIN = LEFT_PANEL_WIDTH_MIN;
const LEFT_MAX = LEFT_PANEL_WIDTH_MAX;
const RIGHT_MIN = RIGHT_PANEL_WIDTH_MIN;
const RIGHT_MAX = RIGHT_PANEL_WIDTH_MAX;
const AI_MIN = AI_PANEL_WIDTH_MIN;
const AI_MAX = AI_PANEL_WIDTH_MAX;
const TIMELINE_MIN = TIMELINE_HEIGHT_MIN;
const TIMELINE_MAX = TIMELINE_HEIGHT_MAX;

function sidePanelStyle(
  pinned: boolean,
  width: number,
  min: number,
  max: number,
): CSSProperties {
  return pinned
    ? { flex: `0 0 ${width}px`, minWidth: min, maxWidth: max }
    : { flex: "1 1 0", minWidth: min };
}

export function AppLayout() {
  useRemotionAutoSync();

  const rowRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  const previewColumnWidth = usePreviewColumnWidth(rowRef, PREVIEW_DISPLAY_ASPECT);

  const [leftPinned, setLeftPinned] = useState(false);
  const [rightPinned, setRightPinned] = useState(false);

  const {
    leftPanelWidth,
    rightPanelWidth,
    aiPanelWidth,
    timelineHeight,
    leftCollapsed,
    rightCollapsed,
    aiCollapsed,
    timelineCollapsed,
    setLeftPanelWidth,
    setRightPanelWidth,
    setAiPanelWidth,
    setTimelineHeight,
  } = useUiStore();

  const onResizeLeft = useCallback(
    (delta: number) => {
      const base = leftPinned
        ? leftPanelWidth
        : (leftRef.current?.getBoundingClientRect().width ?? leftPanelWidth);
      if (!leftPinned) setLeftPinned(true);
      setLeftPanelWidth(Math.min(LEFT_MAX, Math.max(LEFT_MIN, base + delta)));
    },
    [leftPanelWidth, leftPinned, setLeftPanelWidth],
  );

  const onResizeRight = useCallback(
    (delta: number) => {
      const base = rightPinned
        ? rightPanelWidth
        : (rightRef.current?.getBoundingClientRect().width ?? rightPanelWidth);
      if (!rightPinned) setRightPinned(true);
      setRightPanelWidth(Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, base - delta)));
    },
    [rightPanelWidth, rightPinned, setRightPanelWidth],
  );

  const onResizeAi = useCallback(
    (delta: number) => {
      setAiPanelWidth(Math.min(AI_MAX, Math.max(AI_MIN, aiPanelWidth - delta)));
    },
    [aiPanelWidth, setAiPanelWidth],
  );

  const onResizeTimeline = useCallback(
    (delta: number) => {
      setTimelineHeight(
        Math.min(TIMELINE_MAX, Math.max(TIMELINE_MIN, timelineHeight - delta)),
      );
    },
    [timelineHeight, setTimelineHeight],
  );

  const editorSideCount = (leftCollapsed ? 0 : 1) + (rightCollapsed ? 0 : 1);
  const previewFlex =
    editorSideCount === 0 ? "1 1 0" : `0 0 ${previewColumnWidth}px`;

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div ref={rowRef} className="flex min-h-0 flex-1 overflow-hidden">
          {!leftCollapsed && (
            <>
              <div
                ref={leftRef}
                style={sidePanelStyle(leftPinned, leftPanelWidth, LEFT_MIN, LEFT_MAX)}
                className="min-w-0 overflow-hidden"
              >
                <LeftPanel />
              </div>
              <PanelResizer axis="horizontal" onResize={onResizeLeft} />
            </>
          )}
          <main
            style={{ flex: previewFlex }}
            className="flex min-h-0 min-w-0 flex-col overflow-hidden"
          >
            <PreviewWindow />
          </main>
          {!rightCollapsed && (
            <>
              <PanelResizer axis="horizontal" onResize={onResizeRight} />
              <div
                ref={rightRef}
                style={sidePanelStyle(rightPinned, rightPanelWidth, RIGHT_MIN, RIGHT_MAX)}
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
              className="shrink-0 overflow-hidden"
            >
              <TimelinePanel />
            </div>
          </>
        )}
      </div>
      {!aiCollapsed && (
        <>
          <PanelResizer axis="horizontal" onResize={onResizeAi} />
          <div
            style={{
              flex: `0 0 ${aiPanelWidth}px`,
              minWidth: AI_MIN,
              maxWidth: AI_MAX,
            }}
            className="min-h-0 min-w-0 shrink-0 overflow-hidden"
          >
            <AiPanel />
          </div>
        </>
      )}
    </div>
  );
}
