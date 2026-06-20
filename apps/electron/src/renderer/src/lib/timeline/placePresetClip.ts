import { addClip, addTrack, newId } from "@/lib/timeline/mutations";
import { defaultPropsFromPreset } from "@/lib/presetProps";
import { snapClipMove } from "@/lib/timeline/snapClip";
import type { SnapEditOptions } from "@/lib/timeline/snapEditFrame";
import { defaultTrackName } from "@/lib/timeline/trackLabels";
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

function clampDuration(timeline: Timeline, start: number, duration: number): number {
  const max = timeline.durationInFrames - start;
  return Math.max(1, Math.min(duration, max));
}

function buildClipFromPreset(
  preset: PresetDefinition,
  timeline: Timeline,
  startInFrames: number,
): Clip {
  const durationInFrames = clampDuration(
    timeline,
    startInFrames,
    preset.durationInFrames,
  );

  return {
    id: newId("clip"),
    type: "animation",
    name: preset.name,
    startInFrames,
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

export function placePresetOnTimeline(
  timeline: Timeline,
  preset: PresetDefinition,
  options: PlacePresetOptions,
): PlacePresetResult {
  if (preset.kind !== "component" || !preset.component) {
    throw new Error("仅支持组件类预设");
  }

  const { timeline: withTrack, trackId } = resolveAnimationTrack(
    timeline,
    options.trackId,
  );

  let startInFrames = Math.max(
    0,
    Math.min(options.startInFrames, withTrack.durationInFrames - 1),
  );

  const clipDraft = buildClipFromPreset(preset, withTrack, startInFrames);

  if (options.snap) {
    const snapped = snapClipMove(startInFrames, clipDraft.durationInFrames, {
      ...options.snap,
      excludeClipId: clipDraft.id,
    });
    startInFrames = snapped.startInFrames;
  }

  const clip = { ...clipDraft, startInFrames };
  const next = addClip(withTrack, trackId, clip);

  return { timeline: next, clipId: clip.id, trackId };
}
