import { useCallback, useEffect, useMemo, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { Playhead } from "@/components/timeline/Playhead";
import { SpeedGraphHandlesLayer } from "@/components/timeline/graph-editor/SpeedGraphHandlesLayer";
import {
  buildValueGraphHandleBindings,
} from "@/lib/timeline/graph-editor/valueGraphHandleBindings";
import { ValueGraphHandlesLayer } from "@/components/timeline/graph-editor/ValueGraphHandlesLayer";
import { patchValueHandle } from "@/lib/timeline/graph-editor/bezierTangent";
import { easingKeyframePatch } from "@/lib/timeline/graph-editor/easingKeyframePatch";
import {
  sampleSpeedCurve,
  speedAtKeyframe,
  speedRangeForSegments,
  speedSampleStepsForWidth,
  speedSamplesToSvgPath,
} from "@/lib/timeline/graph-editor/sampleSpeedCurve";
import {
  patchIncomingHandle,
  patchOutgoingHandle,
  pointerInfluenceFromFrame,
  speedHandleDisplay,
  speedHandlesForKeyframe,
} from "@/lib/timeline/graph-editor/speedGraphHandles";
import { easyEaseBezierCp } from "@/lib/timeline/graph-editor/temporalEase";
import { TRACK_HEADER_WIDTH } from "@/lib/timeline/constants";
import { frameToPx } from "@/lib/timeline/framePixels";
import { usePlayheadDrag } from "@/hooks/usePlayheadDrag";
import {
  KEYFRAME_ANIMATABLE_PROPERTIES,
  getPropertyValueAtFrame,
} from "@/lib/timeline/keyframes";
import { sampleEasingCurve } from "@/lib/timeline/keyframeEasing";
import { findLayerTrackForClip } from "@/lib/timeline/trackTree";
import { resolveTimelineViewportDuration } from "@/lib/timeline/workArea";
import { KeyframeContextMenu } from "@/components/timeline/KeyframeContextMenu";
import { KeyframeEasingPanel } from "@/components/timeline/KeyframeEasingPanel";
import { CompactSegmentedTabs } from "@/components/common/CompactSegmentedTabs";
import { clampOpacityInternal, formatOpacityValue, isOpacityProperty } from "@/lib/timeline/opacityProperty";
import { clampScaleInternal, formatScaleValue, isScaleProperty } from "@/lib/timeline/scaleProperty";
import {
  formatPositionValue,
  isPositionProperty,
  snapPositionValue,
} from "@/lib/timeline/positionProperty";
import { cn } from "@/lib/utils";
import { useTimelineStore } from "@/stores/timelineStore";
import { useUiStore } from "@/stores/uiStore";
import type { Clip, Keyframe, KeyframeEasing, KeyframeValue } from "@/types/timeline";

const COMPACT_HEIGHT = 32;
const EXPANDED_HEIGHT = 120;

export function KeyframeTrackPanel() {
  const timeline = useTimelineStore((s) => s.timeline);
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);
  const currentFrame = useTimelineStore((s) => s.currentFrame);
  const selectedProperty = useUiStore((s) => s.selectedKeyframeProperty);
  const setSelectedProperty = useUiStore((s) => s.setSelectedKeyframeProperty);
  const graphMode = useUiStore((s) => s.keyframeGraphMode);
  const setGraphMode = useUiStore((s) => s.setKeyframeGraphMode);
  const pxPerFrame = useUiStore((s) => s.pxPerFrame);
  const timelineScrollX = useUiStore((s) => s.timelineScrollX);
  const setTimelineScrollX = useUiStore((s) => s.setTimelineScrollX);
  const keyframePanelExpanded = useUiStore((s) => s.keyframePanelExpanded);
  const toggleKeyframePanel = useUiStore((s) => s.toggleKeyframePanel);
  const scrollRef = useRef<HTMLDivElement>(null);
  const syncingScrollRef = useRef(false);

  const clip = useMemo(() => {
    if (!timeline || !selectedClipId) return null;
    return findLayerTrackForClip(timeline, selectedClipId)?.clip ?? null;
  }, [timeline, selectedClipId]);

  const durationInFrames = timeline ? resolveTimelineViewportDuration(timeline) : 0;
  const contentWidth = Math.max(1, frameToPx(durationInFrames, pxPerFrame));
  const clipOffsetPx = clip ? frameToPx(clip.startInFrames, pxPerFrame) : 0;

  const totalGraphHeight = useMemo(
    () =>
      KEYFRAME_ANIMATABLE_PROPERTIES.reduce(
        (sum, item) =>
          sum + (item.path === selectedProperty ? EXPANDED_HEIGHT : COMPACT_HEIGHT),
        0,
      ),
    [selectedProperty],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || syncingScrollRef.current) return;
    if (Math.abs(el.scrollLeft - timelineScrollX) < 0.5) return;
    syncingScrollRef.current = true;
    el.scrollLeft = timelineScrollX;
    syncingScrollRef.current = false;
  }, [timelineScrollX]);

  const onHorizontalScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (syncingScrollRef.current) return;
      setTimelineScrollX(e.currentTarget.scrollLeft);
    },
    [setTimelineScrollX],
  );

  const onPlayheadDragStart = usePlayheadDrag(scrollRef, pxPerFrame);

  if (!clip || !timeline) return null;

  return (
    <div className="shrink-0 border-t border-border bg-muted/20">
      <button
        type="button"
        className="flex w-full items-center gap-1.5 border-b border-border/60 px-3 py-1.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
        onClick={toggleKeyframePanel}
        aria-expanded={keyframePanelExpanded}
        aria-label={keyframePanelExpanded ? "收起关键帧轨道" : "展开关键帧轨道"}
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-in-out",
            !keyframePanelExpanded && "-rotate-90",
          )}
          aria-hidden
        />
        <span className="min-w-0 truncate">关键帧轨道 · {clip.name}</span>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none",
          keyframePanelExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div
          className={cn(
            "min-h-0 overflow-hidden transition-opacity duration-300 ease-in-out motion-reduce:transition-none",
            keyframePanelExpanded
              ? "opacity-100"
              : "pointer-events-none opacity-0",
          )}
        >
          <div className="border-t border-border/60 pb-2 pt-2">
            <div className="scrollbar-theme max-h-64 overflow-y-auto pr-2">
              <div className="flex min-w-0 items-start">
                <div
                  className="shrink-0 border-r border-border bg-background"
                  style={{ width: TRACK_HEADER_WIDTH }}
                >
                  {KEYFRAME_ANIMATABLE_PROPERTIES.map((item) => {
                    const rowHeight =
                      item.path === selectedProperty ? EXPANDED_HEIGHT : COMPACT_HEIGHT;
                    return (
                      <PropertyKeyframeLabelRow
                        key={item.path}
                        label={item.label}
                        active={item.path === selectedProperty}
                        rowHeight={rowHeight}
                        graphMode={graphMode}
                        onGraphMode={setGraphMode}
                        onSelect={() => setSelectedProperty(item.path)}
                      />
                    );
                  })}
                </div>

                <div
                  ref={scrollRef}
                  className="scrollbar-hidden relative min-w-0 flex-1 overflow-x-auto"
                  onScroll={onHorizontalScroll}
                >
                  <div
                    className="relative"
                    style={{ width: contentWidth, height: totalGraphHeight }}
                  >
                    {KEYFRAME_ANIMATABLE_PROPERTIES.map((item) => (
                      <PropertyKeyframeRow
                        key={item.path}
                        clip={clip}
                        property={item.path}
                        pxPerFrame={pxPerFrame}
                        active={item.path === selectedProperty}
                        rowHeight={
                          item.path === selectedProperty ? EXPANDED_HEIGHT : COMPACT_HEIGHT
                        }
                        contentWidth={contentWidth}
                        clipOffsetPx={clipOffsetPx}
                      />
                    ))}
                    <Playhead
                      currentFrame={currentFrame}
                      pxPerFrame={pxPerFrame}
                      height={totalGraphHeight}
                      onDragStart={onPlayheadDragStart}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {selectedProperty && (
            <PropertyKeyframeDetail clip={clip} property={selectedProperty} />
          )}
        </div>
      </div>
    </div>
  );
}

function PropertyKeyframeLabelRow({
  label,
  active,
  rowHeight,
  graphMode,
  onGraphMode,
  onSelect,
}: {
  label: string;
  active: boolean;
  rowHeight: number;
  graphMode: "speed" | "value";
  onGraphMode: (mode: "speed" | "value") => void;
  onSelect: () => void;
}) {
  return (
    <div
      className={cn(
        "box-border flex shrink-0 flex-col justify-center gap-1 border-b border-border/60 px-2",
        active ? "bg-primary/5" : "bg-background/50",
      )}
      style={{ height: rowHeight }}
    >
      <button
        type="button"
        className="text-left text-xs font-medium text-foreground"
        onClick={onSelect}
      >
        {label}
      </button>
      {active && (
        <CompactSegmentedTabs
          tabs={[
            { id: "speed", label: "速度图" },
            { id: "value", label: "值图" },
          ]}
          active={graphMode}
          onChange={onGraphMode}
        />
      )}
    </div>
  );
}

function PropertyKeyframeRow({
  clip,
  property,
  pxPerFrame,
  active,
  rowHeight,
  contentWidth,
  clipOffsetPx,
}: {
  clip: Clip;
  property: string;
  pxPerFrame: number;
  active: boolean;
  rowHeight: number;
  contentWidth: number;
  clipOffsetPx: number;
}) {
  const moveKeyframe = useTimelineStore((s) => s.moveKeyframe);
  const updateKeyframe = useTimelineStore((s) => s.updateKeyframe);
  const removeKeyframe = useTimelineStore((s) => s.removeKeyframe);
  const fps = useTimelineStore((s) => s.timeline?.fps ?? 30);
  const selectedKeyframeId = useUiStore((s) => s.selectedKeyframeId);
  const setSelectedKeyframeId = useUiStore((s) => s.setSelectedKeyframeId);
  const setSelectedProperty = useUiStore((s) => s.setSelectedKeyframeProperty);
  const graphMode = useUiStore((s) => s.keyframeGraphMode);

  const keyframes = ((clip.keyframes ?? []) as Keyframe[])
    .filter((kf) => kf.property === property)
    .sort((a, b) => a.frame - b.frame);

  const width = frameToPx(clip.durationInFrames, pxPerFrame);
  const graphWidth = Math.max(width, 120);
  const graphHeight = rowHeight;
  const graphRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef<{
    id: string;
    mode: "frame" | "value";
    startX: number;
    startY: number;
    startFrame: number;
    startValue: number;
    valueMin: number;
    valueMax: number;
  } | null>(null);

  const valueRange = useMemo(() => {
    const values = keyframes.map((kf) => Number(kf.value)).filter((v) => !Number.isNaN(v));
    if (isOpacityProperty(property)) {
      return { min: 0, max: 1 };
    }
    if (isScaleProperty(property)) {
      if (values.length === 0) return { min: -1, max: 3 };
      const min = Math.min(...values, 1);
      const max = Math.max(...values, 1);
      const pad = Math.max((max - min) * 0.2, 0.25);
      return { min: min - pad, max: max + pad };
    }
    if (isPositionProperty(property)) {
      if (values.length === 0) return { min: 0, max: 1920 };
      const min = Math.min(...values);
      const max = Math.max(...values);
      const pad = Math.max((max - min) * 0.2, 10);
      return { min: min - pad, max: max + pad };
    }
    if (values.length === 0) return { min: 0, max: 1 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max((max - min) * 0.2, 1);
    return { min: min - pad, max: max + pad };
  }, [keyframes, property]);

  const speedRange = useMemo(
    () => speedRangeForSegments(keyframes, fps),
    [keyframes, fps],
  );

  const frameDenom = Math.max(1, clip.durationInFrames - 1);

  const frameToX = useCallback(
    (frame: number) => frameToPx(frame, pxPerFrame),
    [pxPerFrame],
  );

  const frameFromClientX = useCallback(
    (clientX: number) => {
      const el = graphRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      return Math.max(0, Math.min(clip.durationInFrames - 1, ratio * frameDenom));
    },
    [clip.durationInFrames, frameDenom],
  );

  const speedToY = useCallback(
    (speed: number) => {
      const span = speedRange.max - speedRange.min || 1;
      const ratio = (speed - speedRange.min) / span;
      return graphHeight - ratio * graphHeight;
    },
    [graphHeight, speedRange.max, speedRange.min],
  );

  const speedFromClientY = useCallback(
    (clientY: number) => {
      const el = graphRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const ratio = 1 - (clientY - rect.top) / rect.height;
      const span = speedRange.max - speedRange.min || 1;
      return speedRange.min + ratio * span;
    },
    [speedRange.max, speedRange.min],
  );

  const valueToY = useCallback(
    (value: number) => {
      const span = valueRange.max - valueRange.min || 1;
      const ratio = (value - valueRange.min) / span;
      return graphHeight - ratio * graphHeight;
    },
    [graphHeight, valueRange.max, valueRange.min],
  );

  const valueFromClientY = useCallback(
    (clientY: number) => {
      const el = graphRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const ratio = 1 - (clientY - rect.top) / rect.height;
      const span = valueRange.max - valueRange.min || 1;
      return valueRange.min + ratio * span;
    },
    [valueRange.max, valueRange.min],
  );

  const onPointerMove = useCallback((e: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.mode === "frame") {
      const deltaFrames = Math.round((e.clientX - drag.startX) / pxPerFrame);
      const nextFrame = Math.max(
        0,
        Math.min(clip.durationInFrames - 1, drag.startFrame + deltaFrames),
      );
      if (nextFrame !== drag.startFrame) {
        moveKeyframe(clip.id, drag.id, nextFrame);
        drag.startFrame = nextFrame;
        drag.startX = e.clientX;
      }
      return;
    }
    const span = valueRange.max - valueRange.min || 1;
    const deltaY = drag.startY - e.clientY;
    const deltaValue = (deltaY / graphHeight) * span;
    let nextValue = drag.startValue + deltaValue;
    if (isOpacityProperty(property)) {
      nextValue = clampOpacityInternal(nextValue);
    } else if (isScaleProperty(property)) {
      nextValue = clampScaleInternal(nextValue);
    } else if (isPositionProperty(property)) {
      nextValue = snapPositionValue(nextValue);
    }
    updateKeyframe(clip.id, drag.id, { value: nextValue as KeyframeValue });
  }, [clip.durationInFrames, clip.id, graphHeight, moveKeyframe, property, pxPerFrame, updateKeyframe, valueRange.max, valueRange.min]);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
  }, [onPointerMove]);

  const startDrag = (
    e: React.PointerEvent,
    kf: Keyframe,
    mode: "frame" | "value",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const num = Number(kf.value);
    dragRef.current = {
      id: kf.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startFrame: kf.frame,
      startValue: Number.isNaN(num) ? 0 : num,
      valueMin: valueRange.min,
      valueMax: valueRange.max,
    };
    setSelectedProperty(property);
    setSelectedKeyframeId(kf.id);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
  };

  const speedCurvePaths = useMemo(() => {
    if (keyframes.length < 2) return [];
    const paths: string[] = [];
    for (let i = 0; i < keyframes.length - 1; i += 1) {
      const prev = keyframes[i]!;
      const end = keyframes[i + 1]!;
      const segFrames = end.frame - prev.frame;
      const segPx = frameToPx(segFrames, pxPerFrame);
      const steps = speedSampleStepsForWidth(segPx);
      const samples = sampleSpeedCurve(prev, end, fps, steps);
      const d = speedSamplesToSvgPath(
        samples,
        prev.frame,
        segFrames,
        pxPerFrame,
        graphHeight,
        speedRange.min,
        speedRange.max,
      );
      if (d) paths.push(d);
    }
    return paths;
  }, [fps, graphHeight, keyframes, pxPerFrame, speedRange.max, speedRange.min]);

  const speedBaselineY = useMemo(() => {
    const span = speedRange.max - speedRange.min || 1;
    return graphHeight - ((0 - speedRange.min) / span) * graphHeight;
  }, [graphHeight, speedRange.max, speedRange.min]);

  const valueCurvePaths = useMemo(() => {
    if (keyframes.length < 2) return [];
    const paths: string[] = [];
    const vmin = valueRange.min;
    const vmax = valueRange.max;
    const vspan = vmax - vmin || 1;

    for (let i = 0; i < keyframes.length - 1; i += 1) {
      const start = keyframes[i]!;
      const end = keyframes[i + 1]!;
      const segFrames = end.frame - start.frame;
      if (end.interpolation === "bezier" || end.easing === "spring") {
        const samples = sampleEasingCurve(end, segFrames, fps, 24);
        const d = samples
          .map((p, index) => {
            const frame = start.frame + p.t * segFrames;
            const value = vmin + p.y * vspan;
            const x = frameToPx(frame, pxPerFrame);
            const y = graphHeight - ((value - vmin) / vspan) * graphHeight;
            return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
          })
          .join(" ");
        paths.push(d);
      } else {
        const x0 = frameToPx(start.frame, pxPerFrame);
        const x1 = frameToPx(end.frame, pxPerFrame);
        const y0 = graphHeight - ((Number(start.value) - vmin) / vspan) * graphHeight;
        const y1 = graphHeight - ((Number(end.value) - vmin) / vspan) * graphHeight;
        paths.push(`M${x0.toFixed(2)},${y0.toFixed(2)} L${x1.toFixed(2)},${y1.toFixed(2)}`);
      }
    }
    return paths;
  }, [fps, graphHeight, keyframes, pxPerFrame, valueRange.max, valueRange.min]);

  const applyEasyEase = useCallback(
    (kf: Keyframe, prev: Keyframe | null) => {
      if (!prev) return;
      const bezierCp = easyEaseBezierCp(prev, kf, fps);
      updateKeyframe(clip.id, kf.id, {
        interpolation: "bezier",
        easing: "ease-in-out",
        bezierCp,
      });
    },
    [clip.id, fps, updateKeyframe],
  );

  const onDragIncomingSpeed = useCallback(
    (keyframeId: string, clientX: number, clientY: number) => {
      const index = keyframes.findIndex((k) => k.id === keyframeId);
      if (index <= 0) return;
      const kf = keyframes[index]!;
      const prev = keyframes[index - 1]!;
      const frame = frameFromClientX(clientX);
      const incoming = {
        speed: speedFromClientY(clientY),
        influence: pointerInfluenceFromFrame(
          kf.frame,
          prev.frame,
          frame,
          "incoming",
        ),
      };
      const bezierCp = patchIncomingHandle(prev, kf, incoming, fps);
      updateKeyframe(clip.id, kf.id, {
        interpolation: "bezier",
        bezierCp,
      });
    },
    [
      clip.id,
      fps,
      frameFromClientX,
      keyframes,
      speedFromClientY,
      updateKeyframe,
    ],
  );

  const onDragOutgoingSpeed = useCallback(
    (keyframeId: string, clientX: number, clientY: number) => {
      const index = keyframes.findIndex((k) => k.id === keyframeId);
      if (index < 0 || index >= keyframes.length - 1) return;
      const kf = keyframes[index]!;
      const next = keyframes[index + 1]!;
      const frame = frameFromClientX(clientX);
      const outgoing = {
        speed: speedFromClientY(clientY),
        influence: pointerInfluenceFromFrame(
          kf.frame,
          next.frame,
          frame,
          "outgoing",
        ),
      };
      const bezierCp = patchOutgoingHandle(kf, next, outgoing, fps);
      updateKeyframe(clip.id, next.id, {
        interpolation: "bezier",
        bezierCp,
      });
    },
    [
      clip.id,
      fps,
      frameFromClientX,
      keyframes,
      speedFromClientY,
      updateKeyframe,
    ],
  );

  const onDragIncomingValue = useCallback(
    (keyframeId: string, frame: number, value: number) => {
      const index = keyframes.findIndex((k) => k.id === keyframeId);
      if (index <= 0) return;
      const kf = keyframes[index]!;
      const prev = keyframes[index - 1]!;
      const bezierCp = patchValueHandle(prev, kf, "incoming", frame, value);
      updateKeyframe(clip.id, kf.id, {
        interpolation: "bezier",
        bezierCp,
      });
    },
    [clip.id, keyframes, updateKeyframe],
  );

  const onDragOutgoingValue = useCallback(
    (keyframeId: string, frame: number, value: number) => {
      const index = keyframes.findIndex((k) => k.id === keyframeId);
      if (index < 0 || index >= keyframes.length - 1) return;
      const kf = keyframes[index]!;
      const next = keyframes[index + 1]!;
      const bezierCp = patchValueHandle(kf, next, "outgoing", frame, value);
      updateKeyframe(clip.id, next.id, {
        interpolation: "bezier",
        bezierCp,
      });
    },
    [clip.id, keyframes, updateKeyframe],
  );

  const speedHandleBindings = useMemo(() => {
    if (!active || graphMode !== "speed") return [];
    return keyframes.flatMap((kf, index) => {
      const prev = index > 0 ? keyframes[index - 1]! : null;
      const next = index < keyframes.length - 1 ? keyframes[index + 1]! : null;
      const handles = speedHandlesForKeyframe(prev, kf, next, fps);
      if (!handles) return [];
      const anchorY = speedToY(speedAtKeyframe(keyframes, index, fps));
      return [
        {
          keyframeId: kf.id,
          anchorX: frameToX(kf.frame),
          anchorY,
          emphasized: kf.id === selectedKeyframeId,
          incoming: handles.incoming
            ? speedHandleDisplay(handles.incoming, frameToX, speedToY, anchorY)
            : undefined,
          outgoing: handles.outgoing
            ? speedHandleDisplay(handles.outgoing, frameToX, speedToY, anchorY)
            : undefined,
        },
      ];
    });
  }, [
    active,
    fps,
    frameToX,
    graphMode,
    keyframes,
    selectedKeyframeId,
    speedToY,
  ]);

  const valueHandleBindings = useMemo(() => {
    if (!active || graphMode !== "value") return [];
    return buildValueGraphHandleBindings(keyframes, frameToX, valueToY);
  }, [active, frameToX, graphMode, keyframes, valueToY]);

  const keyframeDiamondY = (kf: Keyframe, index: number) => {
    if (graphMode === "speed") {
      return speedToY(speedAtKeyframe(keyframes, index, fps));
    }
    const num = Number(kf.value);
    if (Number.isNaN(num) || valueRange.max === valueRange.min) {
      return graphHeight / 2;
    }
    return valueToY(num);
  };

  return (
    <div
      className={cn(
        "relative box-border shrink-0 border-b border-border/60",
        active ? "bg-primary/5" : "bg-background/50",
      )}
      style={{ width: contentWidth, height: rowHeight }}
    >
      <div
        ref={graphRef}
        className="absolute rounded bg-muted/40"
        style={{
          left: clipOffsetPx,
          width: graphWidth,
          height: graphHeight,
        }}
      >
        <svg
          className="pointer-events-none absolute inset-0 text-foreground/80"
          width={graphWidth}
          height={graphHeight}
        >
          {graphMode === "speed" && active && (
            <>
              <line
                x1={0}
                y1={speedBaselineY}
                x2={graphWidth}
                y2={speedBaselineY}
                stroke="currentColor"
                strokeOpacity={0.25}
                strokeWidth={1}
                strokeDasharray="4 3"
              />
              <text
                x={4}
                y={12}
                className="fill-muted-foreground text-[9px]"
              >
                速度
              </text>
            </>
          )}
          {(graphMode === "speed" ? speedCurvePaths : valueCurvePaths).map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              className="text-em-teal/80"
            />
          ))}
        </svg>

        {active && graphMode === "speed" && (
          <SpeedGraphHandlesLayer
            width={graphWidth}
            height={graphHeight}
            items={speedHandleBindings}
            onDragIncoming={onDragIncomingSpeed}
            onDragOutgoing={onDragOutgoingSpeed}
          />
        )}

        {active && graphMode === "value" && (
          <ValueGraphHandlesLayer
            width={graphWidth}
            height={graphHeight}
            items={valueHandleBindings}
            frameToX={frameToX}
            valueToY={valueToY}
            onDragIncoming={onDragIncomingValue}
            onDragOutgoing={onDragOutgoingValue}
            frameFromClientX={frameFromClientX}
            valueFromClientY={valueFromClientY}
          />
        )}

        {keyframes.map((kf, kfIndex) => {
          const left = frameToX(kf.frame);
          const top = keyframeDiamondY(kf, kfIndex);
          const kfPrev = kfIndex > 0 ? keyframes[kfIndex - 1]! : null;
          return (
            <KeyframeContextMenu
              key={kf.id}
              keyframe={kf}
              onDelete={() => removeKeyframe(clip.id, kf.id)}
              onSetEasing={(easing: KeyframeEasing) =>
                updateKeyframe(
                  clip.id,
                  kf.id,
                  easingKeyframePatch(easing, kfPrev, kf, fps),
                )
              }
              onEasyEase={() => applyEasyEase(kf, kfPrev)}
            >
              <button
                type="button"
                title={`f${kf.frame}: ${formatKeyframeValue(property, kf.value)}（水平拖改帧，Shift+垂直拖改值）`}
                className={cn(
                  "absolute z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border shadow hover:scale-125",
                  selectedKeyframeId === kf.id
                    ? "border-primary bg-primary"
                    : "border-amber-300 bg-amber-400",
                )}
                style={{ left, top }}
                onPointerDown={(e) => {
                  if (e.shiftKey) startDrag(e, kf, "value");
                  else startDrag(e, kf, "frame");
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedProperty(property);
                  setSelectedKeyframeId(kf.id);
                }}
              />
            </KeyframeContextMenu>
          );
        })}
      </div>
    </div>
  );
}

function PropertyKeyframeDetail({
  clip,
  property,
}: {
  clip: Clip;
  property: string;
}) {
  const updateKeyframe = useTimelineStore((s) => s.updateKeyframe);
  const fps = useTimelineStore((s) => s.timeline?.fps ?? 30);
  const selectedKeyframeId = useUiStore((s) => s.selectedKeyframeId);
  const graphMode = useUiStore((s) => s.keyframeGraphMode);

  const keyframes = ((clip.keyframes ?? []) as Keyframe[])
    .filter((kf) => kf.property === property)
    .sort((a, b) => a.frame - b.frame);
  const selectedKeyframe =
    selectedKeyframeId != null
      ? keyframes.find((kf) => kf.id === selectedKeyframeId)
      : undefined;
  const selectedIndex = selectedKeyframe
    ? keyframes.findIndex((kf) => kf.id === selectedKeyframe.id)
    : -1;
  const prevKeyframe = selectedIndex > 0 ? keyframes[selectedIndex - 1]! : null;

  return (
    <div className="flex border-t border-border/60">
      <div className="shrink-0" style={{ width: TRACK_HEADER_WIDTH }} />
      <div className="min-w-0 flex-1 px-3 py-2">
      <p className="font-mono text-xs leading-snug text-foreground/70">
        {graphMode === "speed"
          ? "速度图：拖方向手柄 sculpt 缓动（↑加速 ↓减速，远离关键帧=影响更大）"
          : "值图：拖手柄精调值曲线"}
        {` · f${clip.startInFrames}: ${formatKeyframeValue(property, getPropertyValueAtFrame(clip, property, 0))} → f${clip.startInFrames + clip.durationInFrames - 1}: ${formatKeyframeValue(property, getPropertyValueAtFrame(clip, property, clip.durationInFrames - 1))}`}
        {" · "}Shift+拖 改值
      </p>

      {selectedKeyframe && (
        <KeyframeEasingPanel
          keyframe={selectedKeyframe}
          prevKeyframe={prevKeyframe}
          fps={fps}
          disabled={false}
          onPatch={(patch) => updateKeyframe(clip.id, selectedKeyframe.id, patch)}
        />
      )}
      </div>
    </div>
  );
}

function formatKeyframeValue(property: string, value: unknown): string {
  if (isOpacityProperty(property)) {
    return formatOpacityValue(value);
  }
  if (isScaleProperty(property)) {
    return formatScaleValue(value);
  }
  if (isPositionProperty(property)) {
    return formatPositionValue(value);
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return String(value ?? "—");
}
