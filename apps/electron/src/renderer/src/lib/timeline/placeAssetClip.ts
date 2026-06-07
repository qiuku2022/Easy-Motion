import { addClip, addTrack, newId } from "@/lib/timeline/mutations";
import { snapClipMove } from "@/lib/timeline/snapClip";
import type { SnapEditOptions } from "@/lib/timeline/snapEditFrame";
import { defaultTrackName } from "@/lib/timeline/trackLabels";
import type { ProjectAsset } from "@/types/asset";
import { assetTrackType } from "@/types/asset";
import type { Clip, Timeline, TrackType } from "@/types/timeline";

export interface PlaceAssetOptions {
  startInFrames: number;
  trackId?: string | null;
  snap?: SnapEditOptions;
}

export interface PlaceAssetResult {
  timeline: Timeline;
  clipId: string;
  trackId: string;
}

function defaultDuration(asset: ProjectAsset, timeline: Timeline, start: number): number {
  const fromAsset = asset.durationInFrames;
  if (fromAsset && fromAsset > 0) {
    return Math.min(fromAsset, timeline.durationInFrames - start);
  }
  const fallback = asset.type === "image" ? timeline.fps * 3 : timeline.fps * 5;
  return Math.min(Math.max(1, fallback), timeline.durationInFrames - start);
}

function buildClipFromAsset(asset: ProjectAsset, timeline: Timeline, start: number): Clip {
  const trackType = assetTrackType(asset.type);
  const durationInFrames = defaultDuration(asset, timeline, start);

  const transform = {
    position: { x: timeline.width / 2, y: timeline.height / 2 },
    scale: 1,
    rotation: 0,
    opacity: 1,
  };

  return {
    id: newId("clip"),
    type: trackType,
    name: asset.originalName,
    startInFrames: start,
    durationInFrames,
    lastModifiedBy: "user",
    source: {
      kind: "asset",
      assetId: asset.id,
      publicPath: asset.publicPath,
      path: asset.path,
    },
    transform,
    style:
      trackType === "image" || trackType === "video"
        ? { objectFit: "contain" as const }
        : undefined,
    keyframes: [],
  };
}

function resolveTargetTrack(
  timeline: Timeline,
  trackType: TrackType,
  preferredTrackId?: string | null,
): { timeline: Timeline; trackId: string } {
  if (preferredTrackId) {
    const preferred = timeline.tracks.find((t) => t.id === preferredTrackId);
    if (preferred && !preferred.locked && preferred.type === trackType) {
      return { timeline, trackId: preferred.id };
    }
  }

  const existing = timeline.tracks.find(
    (t) => t.type === trackType && !t.locked,
  );
  if (existing) return { timeline, trackId: existing.id };

  const next = addTrack(timeline, trackType, defaultTrackName(trackType));
  const created = [...next.tracks]
    .filter((t) => t.type === trackType)
    .sort((a, b) => b.order - a.order)[0];
  return { timeline: next, trackId: created.id };
}

export function placeAssetOnTimeline(
  timeline: Timeline,
  asset: ProjectAsset,
  options: PlaceAssetOptions,
): PlaceAssetResult {
  const trackType = assetTrackType(asset.type);
  const { timeline: withTrack, trackId } = resolveTargetTrack(
    timeline,
    trackType,
    options.trackId,
  );

  let startInFrames = Math.max(
    0,
    Math.min(options.startInFrames, withTrack.durationInFrames - 1),
  );
  const clipDraft = buildClipFromAsset(asset, withTrack, startInFrames);

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
