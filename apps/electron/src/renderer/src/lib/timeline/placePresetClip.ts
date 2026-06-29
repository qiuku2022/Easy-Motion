import { ensureTimelineFitsClip } from "@/lib/timeline/workArea";
import { addClip, addTrack, newId } from "@/lib/timeline/mutations";
import {
  clampMoveStart,
  hasOverlapOnTrack,
} from "@/lib/timeline/clipCollision";
import { defaultPropsFromPreset } from "@/lib/presetProps";
import { snapClipMove } from "@/lib/timeline/snapClip";
import type { SnapEditOptions } from "@/lib/timeline/snapEditFrame";
import { defaultTrackName } from "@/lib/timeline/trackLabels";
import { findTrackById } from "@/lib/timeline/trackTree";
import type { PresetDefinition } from "@/types/preset";
import type { Clip, Timeline } from "@/types/timeline";

export interface PlacePresetOptions {
  startInFrames: number;
  trackId?: string | null;
  snap?: SnapEditOptions;
}

export interface PlacePresetResult {
  timeline: Timeline;
  clipId: string;
  trackId: string;
}

function buildClipFromPreset(
  preset: PresetDefinition,
  timeline: Timeline,
  durationInFrames: number,
): Omit<Clip, "startInFrames"> {
  return {
    id: newId("clip"),
    type: "animation",
    name: preset.name,
    durationInFrames,
    lastModifiedBy: "user",
    source: {
      kind: "component",
      component: preset.component,
      presetId: preset.id,
      props: defaultPropsFromPreset(preset),
    },
    transform: {
      position: {
        x: Math.round(timeline.width / 2),
        y: Math.round(timeline.height / 2),
      },
      scale: 1,
      rotation: 0,
      opacity: 1,
    },
    keyframes: [],
  };
}

function resolveAnimationTrack(
  timeline: Timeline,
  preferredTrackId?: string | null,
): { timeline: Timeline; trackId: string } {
  if (preferredTrackId) {
    const preferred = timeline.tracks.find((t) => t.id === preferredTrackId);
    if (preferred && !preferred.locked && preferred.type === "animation") {
      return { timeline, trackId: preferred.id };
    }
  }

  const existing = timeline.tracks.find(
    (t) => t.type === "animation" && !t.locked,
  );
  if (existing) return { timeline, trackId: existing.id };

  const next = addTrack(timeline, "animation", defaultTrackName("animation"));
  const created = [...next.tracks]
    .filter((t) => t.type === "animation")
    .sort((a, b) => b.order - a.order)[0];
  return { timeline: next, trackId: created.id };
}

/** 同轨道无空位时新建动画轨道叠放（避免「与同轨道其它片段重叠」） */
function resolvePresetPlacement(
  timeline: Timeline,
  trackId: string,
  startInFrames: number,
  presetDuration: number,
): { timeline: Timeline; trackId: string; startInFrames: number } {
  const duration = Math.max(1, presetDuration);
  let next = ensureTimelineFitsClip(timeline, startInFrames, duration);
  let start = clampMoveStart(startInFrames, duration, next.durationInFrames);
  let targetTrackId = trackId;

  const tryPlace = () => {
    const track = findTrackById(next, targetTrackId);
    if (!track) {
      throw new Error("轨道不存在");
    }
    return !hasOverlapOnTrack(track, { start, end: start + duration });
  };

  if (!tryPlace()) {
    const withNewTrack = addTrack(next, "animation", defaultTrackName("animation"));
    const created = [...withNewTrack.tracks]
      .filter((t) => t.type === "animation")
      .sort((a, b) => b.order - a.order)[0]!;
    targetTrackId = created.id;
    next = withNewTrack;
    next = ensureTimelineFitsClip(next, start, duration);
    start = clampMoveStart(startInFrames, duration, next.durationInFrames);
  }

  return { timeline: next, trackId: targetTrackId, startInFrames: start };
}

export function placePresetOnTimeline(
  timeline: Timeline,
  preset: PresetDefinition,
  options: PlacePresetOptions,
): PlacePresetResult {
  if (preset.kind !== "component" || !preset.component) {
    throw new Error("仅支持组件类预设");
  }

  const presetDuration = Math.max(1, preset.durationInFrames);

  const { timeline: withTrack, trackId } = resolveAnimationTrack(
    timeline,
    options.trackId,
  );

  let startInFrames = Math.max(0, options.startInFrames);

  const clipDraft = buildClipFromPreset(preset, withTrack, presetDuration);

  if (options.snap) {
    const snapped = snapClipMove(startInFrames, presetDuration, {
      ...options.snap,
      excludeClipId: clipDraft.id,
    });
    startInFrames = snapped.startInFrames;
  }

  const placement = resolvePresetPlacement(
    withTrack,
    trackId,
    startInFrames,
    presetDuration,
  );
  const clip: Clip = { ...clipDraft, startInFrames: placement.startInFrames };
  const next = addClip(placement.timeline, placement.trackId, clip);

  return { timeline: next, clipId: clip.id, trackId: placement.trackId };
}
