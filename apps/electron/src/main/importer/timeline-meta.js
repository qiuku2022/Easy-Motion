/** 解析/合并时间线 Composition 元数据（fps、尺寸、时长） */

function isValidTimelineNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function deriveDurationFromTracks(tracks) {
  let maxEnd = 0;

  function walkTrack(track) {
    for (const clip of track.clips ?? []) {
      if (
        typeof clip.startInFrames === "number" &&
        typeof clip.durationInFrames === "number"
      ) {
        maxEnd = Math.max(maxEnd, clip.startInFrames + clip.durationInFrames);
      }
    }
    if (track.type === "group") {
      for (const child of track.children ?? []) {
        walkTrack(child);
      }
    }
  }

  for (const track of tracks ?? []) {
    walkTrack(track);
  }

  return maxEnd > 0 ? maxEnd : null;
}

function pickTimelineNumber(...candidates) {
  for (const value of candidates) {
    if (isValidTimelineNumber(value)) return value;
  }
  return null;
}

function resolveTimelineMeta({
  composition,
  manifestTimeline,
  existingTimeline,
  previewConfig,
  tracks,
}) {
  const fromTracks = deriveDurationFromTracks(tracks);

  return {
    fps:
      pickTimelineNumber(
        composition?.fps,
        manifestTimeline?.fps,
        existingTimeline?.fps,
        previewConfig?.fps,
      ) ?? 30,
    durationInFrames:
      pickTimelineNumber(
        composition?.durationInFrames,
        manifestTimeline?.durationInFrames,
        existingTimeline?.durationInFrames,
        previewConfig?.durationInFrames,
        fromTracks,
      ) ?? 300,
    width:
      pickTimelineNumber(
        composition?.width,
        manifestTimeline?.width,
        existingTimeline?.width,
        previewConfig?.width,
      ) ?? 1920,
    height:
      pickTimelineNumber(
        composition?.height,
        manifestTimeline?.height,
        existingTimeline?.height,
        previewConfig?.height,
      ) ?? 1080,
  };
}

function readPreviewConfig(remotionSrcDir) {
  const fs = require("node:fs");
  const path = require("node:path");
  const configPath = path.join(remotionSrcDir, "preview-config.json");
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    return null;
  }
}

module.exports = {
  isValidTimelineNumber,
  deriveDurationFromTracks,
  pickTimelineNumber,
  resolveTimelineMeta,
  readPreviewConfig,
};
