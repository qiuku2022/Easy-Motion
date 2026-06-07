const TRACK_TYPES = [
  "text",
  "image",
  "video",
  "audio",
  "shape",
  "chart",
  "animation",
  "group",
];

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateTimeline(timeline) {
  if (!isObject(timeline)) {
    throw new Error("timeline must be an object");
  }

  const requiredNumbers = ["fps", "durationInFrames", "width", "height"];
  for (const key of requiredNumbers) {
    if (typeof timeline[key] !== "number" || Number.isNaN(timeline[key])) {
      throw new Error(`timeline.${key} must be a number`);
    }
  }

  if (!Array.isArray(timeline.tracks)) {
    throw new Error("timeline.tracks must be an array");
  }

  for (const track of timeline.tracks) {
    if (!TRACK_TYPES.includes(track.type)) {
      throw new Error(`invalid track type: ${track.type}`);
    }
    if (!Array.isArray(track.clips)) {
      throw new Error(`track ${track.id} clips must be an array`);
    }
    validateTrackClips(track, timeline.durationInFrames);
    if (track.type === "group") {
      if (!Array.isArray(track.children)) {
        throw new Error(`group ${track.id} must have children array`);
      }
      if (track.clips.length > 0) {
        throw new Error(`group ${track.id} must not contain clips`);
      }
      for (const child of track.children) {
        if (!TRACK_TYPES.includes(child.type) || child.type === "group") {
          throw new Error(`invalid child track type in group ${track.id}`);
        }
        validateTrackClips(child, timeline.durationInFrames);
      }
    }
  }

  return true;
}

function validateTrackClips(track, durationInFrames) {
  for (const clip of track.clips) {
    if (
      typeof clip.startInFrames !== "number" ||
      typeof clip.durationInFrames !== "number"
    ) {
      throw new Error(`clip ${clip.id} frame range invalid`);
    }
    if (clip.startInFrames + clip.durationInFrames > durationInFrames) {
      throw new Error(`clip ${clip.id} exceeds timeline duration`);
    }
  }
}

module.exports = {
  TRACK_TYPES,
  validateTimeline,
};
