import { useCallback, useMemo, useRef } from "react";
import { frameToPx } from "@/lib/timeline/framePixels";
import {
  KEYFRAME_ANIMATABLE_PROPERTIES,
  getPropertyValueAtFrame,
} from "@/lib/timeline/keyframes";
import { sampleEasingCurve } from "@/lib/timeline/keyframeEasing";
import { findLayerTrackForClip } from "@/lib/timeline/trackTree";
import { KeyframeContextMenu } from "@/components/timeline/KeyframeContextMenu";
import { KeyframeEasingPanel } from "@/components/timeline/KeyframeEasingPanel";
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

const ROW_HEIGHT = 32;

export function KeyframeTrackPanel() {
  const timeline = useTimelineStore((s) => s.timeline);
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);
  const selectedProperty = useUiStore((s) => s.selectedKeyframeProperty);
  const setSelectedProperty = useUiStore((s) => s.setSelectedKeyframeProperty);
  const pxPerFrame = useUiStore((s) => s.pxPerFrame);

  const clip = useMemo(() => {
    if (!timeline || !selectedClipId) return null;
    return findLayerTrackForClip(timeline, selectedClipId)?.clip ?? null;
  }, [timeline, selectedClipId]);

  if (!clip) return null;

  return (
    <div className="shrink-0 border-t border-border bg-muted/20">
      <div className="px-3 py-1.5 text-sm font-medium text-foreground">
        关键帧轨道 · {clip.name}
      </div>

      <div className="px-3 pb-2">
        <div className="scrollbar-theme -mr-1 max-h-52 space-y-2 overflow-y-auto pr-1">
          {KEYFRAME_ANIMATABLE_PROPERTIES.map((item) => (
            <PropertyKeyframeRow
              key={item.path}
              clip={clip}
              property={item.path}
              pxPerFrame={pxPerFrame}
              active={item.path === selectedProperty}
              onSelect={() => setSelectedProperty(item.path)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PropertyKeyframeRow({
  clip,
  property,
  pxPerFrame,
  active,
  onSelect,
}: {
  clip: Clip;
  property: string;
  pxPerFrame: number;
  active: boolean;
  onSelect: () => void;
}) {
  const moveKeyframe = useTimelineStore((s) => s.moveKeyframe);
  const updateKeyframe = useTimelineStore((s) => s.updateKeyframe);
  const removeKeyframe = useTimelineStore((s) => s.removeKeyframe);
  const fps = useTimelineStore((s) => s.timeline?.fps ?? 30);
  const selectedKeyframeId = useUiStore((s) => s.selectedKeyframeId);
  const setSelectedKeyframeId = useUiStore((s) => s.setSelectedKeyframeId);
  const setSelectedProperty = useUiStore((s) => s.setSelectedKeyframeProperty);

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
  const label =
    KEYFRAME_ANIMATABLE_PROPERTIES.find((p) => p.path === property)?.label ??
    property;
  const width = frameToPx(clip.durationInFrames, pxPerFrame);
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
    const deltaValue = (deltaY / ROW_HEIGHT) * span;
    let nextValue = drag.startValue + deltaValue;
    if (isOpacityProperty(property)) {
      nextValue = clampOpacityInternal(nextValue);
    } else if (isScaleProperty(property)) {
      nextValue = clampScaleInternal(nextValue);
    } else if (isPositionProperty(property)) {
      nextValue = snapPositionValue(nextValue);
    }
    updateKeyframe(clip.id, drag.id, { value: nextValue as KeyframeValue });
  }, [clip.durationInFrames, clip.id, moveKeyframe, property, pxPerFrame, updateKeyframe, valueRange.max, valueRange.min]);

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

  const curvePoints = useMemo(() => {
    if (keyframes.length < 2) return "";
    const start = keyframes[0]!;
    const end = keyframes[keyframes.length - 1]!;
    const span = end.frame - start.frame;
    if (end.interpolation === "bezier" || end.easing === "spring") {
      const samples = sampleEasingCurve(end, span, fps, 20);
      const min = valueRange.min;
      const max = valueRange.max;
      const valueSpan = max - min || 1;
      return samples
        .map((p, index) => {
          const x = (p.t * span) / Math.max(1, clip.durationInFrames - 1);
          const value = min + p.y * valueSpan;
          const px = (x / Math.max(1, clip.durationInFrames - 1)) * 100;
          const py = 100 - ((value - min) / valueSpan) * 100;
          return `${index === 0 ? "M" : "L"}${px},${py}`;
        })
        .join(" ");
    }
    const values = keyframes.map((kf) => Number(kf.value));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const valueSpan = max - min || 1;
    return keyframes
      .map((kf, index) => {
        const x = (kf.frame / Math.max(1, clip.durationInFrames - 1)) * 100;
        const y = 100 - ((Number(kf.value) - min) / valueSpan) * 100;
        return `${index === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }, [clip.durationInFrames, fps, keyframes, valueRange.max, valueRange.min]);

  return (
    <div
      className={cn(
        "rounded border px-2 py-1.5",
        active ? "border-primary/50 bg-primary/5" : "border-border/60 bg-background/50",
      )}
    >
      <button
        type="button"
        className="mb-1 text-xs font-medium text-foreground"
        onClick={onSelect}
      >
        {label}
      </button>
      <div
        className="relative rounded bg-muted/40"
        style={{ width: Math.max(width, 120), height: ROW_HEIGHT }}
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full text-em-teal/50"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {curvePoints ? <path d={curvePoints} fill="none" stroke="currentColor" strokeWidth="2" /> : null}
        </svg>
        {keyframes.map((kf) => {
          const left = frameToPx(kf.frame, pxPerFrame);
          const num = Number(kf.value);
          const y =
            Number.isNaN(num) || valueRange.max === valueRange.min
              ? 50
              : 100 -
                ((num - valueRange.min) / (valueRange.max - valueRange.min)) * 100;
          return (
            <KeyframeContextMenu
              key={kf.id}
              keyframe={kf}
              onDelete={() => removeKeyframe(clip.id, kf.id)}
              onSetEasing={(easing: KeyframeEasing) =>
                updateKeyframe(clip.id, kf.id, { easing })
              }
            >
              <button
                type="button"
                title={`f${kf.frame}: ${formatKeyframeValue(property, kf.value)}（水平拖改帧，垂直拖改值）`}
                className={cn(
                  "absolute z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border shadow hover:scale-125",
                  selectedKeyframeId === kf.id
                    ? "border-primary bg-primary"
                    : "border-amber-300 bg-amber-400",
                )}
                style={{ left, top: `${y}%` }}
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
      <p className="mt-1 font-mono text-xs leading-snug text-foreground/70">
        预览 f{clip.startInFrames}:{" "}
        {formatKeyframeValue(property, getPropertyValueAtFrame(clip, property, 0))} → f
        {clip.durationInFrames - 1}:{" "}
        {formatKeyframeValue(
          property,
          getPropertyValueAtFrame(clip, property, clip.durationInFrames - 1),
        )}
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
