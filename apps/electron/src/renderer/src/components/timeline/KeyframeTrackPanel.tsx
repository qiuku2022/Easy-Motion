import { useCallback, useMemo, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { frameToPx } from "@/lib/timeline/framePixels";
import {
  KEYFRAME_ANIMATABLE_PROPERTIES,
  getPropertyValueAtFrame,
} from "@/lib/timeline/keyframes";
import { sampleEasingCurve } from "@/lib/timeline/keyframeEasing";
import { findLayerTrackForClip } from "@/lib/timeline/trackTree";
import { cn } from "@/lib/utils";
import { useTimelineStore } from "@/stores/timelineStore";
import { useUiStore } from "@/stores/uiStore";
import type { Clip, Keyframe } from "@/types/timeline";

export function KeyframeTrackPanel() {
  const timeline = useTimelineStore((s) => s.timeline);
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);
  const expanded = useUiStore((s) => s.keyframePanelExpanded);
  const toggle = useUiStore((s) => s.toggleKeyframePanel);
  const selectedProperty = useUiStore((s) => s.selectedKeyframeProperty);
  const setSelectedProperty = useUiStore((s) => s.setSelectedKeyframeProperty);
  const pxPerFrame = useUiStore((s) => s.pxPerFrame);

  const clip = useMemo(() => {
    if (!timeline || !selectedClipId) return null;
    return findLayerTrackForClip(timeline, selectedClipId)?.clip ?? null;
  }, [timeline, selectedClipId]);

  if (!clip) return null;

  const keyframes = (clip.keyframes ?? []) as Keyframe[];
  const properties =
    keyframes.length > 0
      ? [...new Set(keyframes.map((kf) => kf.property))]
      : KEYFRAME_ANIMATABLE_PROPERTIES.map((p) => p.path);

  return (
    <div className="shrink-0 border-t border-border bg-muted/20">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-foreground hover:bg-accent/40"
        onClick={toggle}
      >
        <span className="font-medium">关键帧轨道 · {clip.name}</span>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-2">
          <div className="scrollbar-theme -mr-1 max-h-40 space-y-2 overflow-y-auto pr-1">
            {properties.map((property) => (
              <PropertyKeyframeRow
                key={property}
                clip={clip}
                property={property}
                pxPerFrame={pxPerFrame}
                active={property === selectedProperty}
                onSelect={() => setSelectedProperty(property)}
              />
            ))}
          </div>
        </div>
      )}
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
  const fps = useTimelineStore((s) => s.timeline?.fps ?? 30);
  const keyframes = ((clip.keyframes ?? []) as Keyframe[]).filter(
    (kf) => kf.property === property,
  );
  const label =
    KEYFRAME_ANIMATABLE_PROPERTIES.find((p) => p.path === property)?.label ??
    property;
  const width = frameToPx(clip.durationInFrames, pxPerFrame);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startFrame: number;
    latestX?: number;
  } | null>(null);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      drag.latestX = e.clientX;
    },
    [],
  );

  const endDrag = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      dragRef.current = null;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      if (!drag) return;
      const deltaFrames = Math.round((e.clientX - drag.startX) / pxPerFrame);
      const nextFrame = Math.max(
        0,
        Math.min(clip.durationInFrames - 1, drag.startFrame + deltaFrames),
      );
      if (nextFrame !== drag.startFrame) {
        moveKeyframe(clip.id, drag.id, nextFrame);
      }
    },
    [clip.durationInFrames, clip.id, moveKeyframe, onPointerMove, pxPerFrame],
  );

  const startDrag = (e: React.PointerEvent, kf: Keyframe) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { id: kf.id, startX: e.clientX, startFrame: kf.frame };
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
      const min = Math.min(...keyframes.map((kf) => Number(kf.value)));
      const max = Math.max(...keyframes.map((kf) => Number(kf.value)));
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
  }, [clip.durationInFrames, fps, keyframes]);

  return (
    <div
      className={cn(
        "rounded border px-2 py-1.5",
        active ? "border-primary/50 bg-primary/5" : "border-border/60 bg-background/50",
      )}
    >
      <button
        type="button"
        className="mb-1 text-[10px] font-medium text-foreground"
        onClick={onSelect}
      >
        {label}
      </button>
      <div className="relative h-8 rounded bg-muted/40" style={{ width: Math.max(width, 120) }}>
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full text-em-teal/50"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {curvePoints ? <path d={curvePoints} fill="none" stroke="currentColor" strokeWidth="2" /> : null}
        </svg>
        {keyframes.map((kf) => {
          const left = frameToPx(kf.frame, pxPerFrame);
          return (
            <button
              key={kf.id}
              type="button"
              title={`f${kf.frame}: ${String(kf.value)}`}
              className="absolute top-1/2 z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-amber-300 bg-amber-400 shadow hover:scale-125"
              style={{ left }}
              onPointerDown={(e) => startDrag(e, kf)}
            />
          );
        })}
      </div>
      <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
        预览 f{clip.startInFrames}:{" "}
        {formatKeyframeValue(getPropertyValueAtFrame(clip, property, 0))} → f
        {clip.durationInFrames - 1}:{" "}
        {formatKeyframeValue(
          getPropertyValueAtFrame(clip, property, clip.durationInFrames - 1),
        )}
      </p>
    </div>
  );
}

function formatKeyframeValue(value: unknown): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return String(value ?? "—");
}
