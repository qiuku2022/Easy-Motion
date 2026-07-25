import { useCallback, useRef, useState, type CSSProperties } from "react";
import { AiPanel } from "@/components/layout/AiPanel";
import { CollapsiblePanelSlot } from "@/components/layout/CollapsiblePanelSlot";
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

/**
 * 编辑器左右栏外层占位：
 * - 未拖拽：flex 均分预览列之外的剩余宽度（不受 Tab 内容影响）
 * - 已拖拽 / 收起：不设 flex，由内容宽或 CollapsiblePanelSlot 收为 0
 */
function editorSideSlotStyle(
  collapsed: boolean,
  pinned: boolean,
  min: number
): CSSProperties | undefined {
  if (collapsed || pinned) return undefined;
  // 不设 maxWidth，宽屏剩余空间才能真正吃进两侧
  return { flex: "1 1 0", minWidth: min };
}

function pinnedPanelStyle(width: number, min: number, max: number) {
  return {
    flex: `0 0 ${width}px`,
    width,
    minWidth: min,
    maxWidth: max,
  } as const;
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
    [leftPanelWidth, leftPinned, setLeftPanelWidth]
  );

  const onResizeRight = useCallback(
    (delta: number) => {
      const base = rightPinned
        ? rightPanelWidth
        : (rightRef.current?.getBoundingClientRect().width ?? rightPanelWidth);
      if (!rightPinned) setRightPinned(true);
      setRightPanelWidth(Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, base - delta)));
    },
    [rightPanelWidth, rightPinned, setRightPanelWidth]
  );

  const onResizeAi = useCallback(
    (delta: number) => {
      setAiPanelWidth(Math.min(AI_MAX, Math.max(AI_MIN, aiPanelWidth - delta)));
    },
    [aiPanelWidth, setAiPanelWidth]
  );

  const onResizeTimeline = useCallback(
    (delta: number) => {
      setTimelineHeight(
        Math.min(TIMELINE_MAX, Math.max(TIMELINE_MIN, timelineHeight - delta))
      );
    },
    [timelineHeight, setTimelineHeight]
  );

  const editorSideCount = (leftCollapsed ? 0 : 1) + (rightCollapsed ? 0 : 1);
  const previewFlex =
    editorSideCount === 0 ? "1 1 0" : `0 0 ${previewColumnWidth}px`;

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div ref={rowRef} className="flex min-h-0 flex-1 overflow-hidden">
          <CollapsiblePanelSlot
            expanded={!leftCollapsed}
            axis="horizontal"
            className={
              leftCollapsed || leftPinned ? "shrink-0" : "min-w-0 overflow-hidden"
            }
            style={editorSideSlotStyle(leftCollapsed, leftPinned, LEFT_MIN)}
            innerClassName="flex min-w-0"
          >
            <div
              ref={leftRef}
              style={
                leftPinned
                  ? pinnedPanelStyle(leftPanelWidth, LEFT_MIN, LEFT_MAX)
                  : undefined
              }
              className={
                leftPinned
                  ? "min-w-0 overflow-hidden"
                  : "min-w-0 flex-1 overflow-hidden"
              }
            >
              <LeftPanel />
            </div>
            <PanelResizer axis="horizontal" onResize={onResizeLeft} />
          </CollapsiblePanelSlot>
          <main
            style={{ flex: previewFlex }}
            className="flex min-h-0 min-w-0 flex-col overflow-hidden"
          >
            <PreviewWindow />
          </main>
          <CollapsiblePanelSlot
            expanded={!rightCollapsed}
            axis="horizontal"
            className={
              rightCollapsed || rightPinned
                ? "shrink-0"
                : "min-w-0 overflow-hidden"
            }
            style={editorSideSlotStyle(rightCollapsed, rightPinned, RIGHT_MIN)}
            innerClassName="flex min-w-0"
          >
            <PanelResizer axis="horizontal" onResize={onResizeRight} />
            <div
              ref={rightRef}
              style={
                rightPinned
                  ? pinnedPanelStyle(rightPanelWidth, RIGHT_MIN, RIGHT_MAX)
                  : undefined
              }
              className={
                rightPinned
                  ? "min-w-0 overflow-hidden"
                  : "min-w-0 flex-1 overflow-hidden"
              }
            >
              <RightPanel />
            </div>
          </CollapsiblePanelSlot>
        </div>
        <CollapsiblePanelSlot
          expanded={!timelineCollapsed}
          axis="vertical"
          className="shrink-0"
          innerClassName="flex min-h-0 flex-col"
        >
          <PanelResizer axis="vertical" onResize={onResizeTimeline} />
          <div style={{ height: timelineHeight }} className="overflow-hidden">
            <TimelinePanel />
          </div>
        </CollapsiblePanelSlot>
      </div>
      <CollapsiblePanelSlot
        expanded={!aiCollapsed}
        axis="horizontal"
        className="shrink-0"
        innerClassName="flex min-h-0"
      >
        <PanelResizer axis="horizontal" onResize={onResizeAi} />
        <div
          style={pinnedPanelStyle(aiPanelWidth, AI_MIN, AI_MAX)}
          className="min-h-0 min-w-0 overflow-hidden"
        >
          <AiPanel />
        </div>
      </CollapsiblePanelSlot>
    </div>
  );
}
