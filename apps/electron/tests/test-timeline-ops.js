const timelineOps = require("../src/main/agent/timeline-ops");
const { needsUserOverwriteConfirm } = require("../src/main/agent/conflict");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  let timeline = {
    version: "1.0",
    fps: 30,
    durationInFrames: 90,
    width: 1280,
    height: 720,
    tracks: [],
  };

  const { timeline: withTrack, track } = timelineOps.createTrack(timeline, {
    name: "标题",
    type: "text",
  });
  timeline = withTrack;
  assert(track.id, "track should have id");

  const clipResult = timelineOps.createClip(timeline, {
    trackId: track.id,
    name: "Hello",
    startInFrames: 0,
    durationInFrames: 60,
    source: { kind: "inline", content: "Hello" },
    animations: { in: { type: "fade", durationInFrames: 15 } },
  });
  timeline = clipResult.timeline;
  assert(clipResult.clip.source.content === "Hello", "clip content");

  const animated = timelineOps.setAnimation(timeline, {
    clipId: clipResult.clip.id,
    animationType: "in",
    config: { type: "fade", durationInFrames: 20 },
  });
  timeline = animated.timeline;

  const updated = timelineOps.updateClip(timeline, {
    clipId: clipResult.clip.id,
    updates: { "source.content": "World" },
  });
  timeline = updated.timeline;
  assert(
    timelineOps.findClipLocation(timeline.tracks, clipResult.clip.id).clip.source
      .content === "World",
    "updateClip content"
  );
  assert(
    timelineOps.findClipLocation(timeline.tracks, clipResult.clip.id).clip
      .lastModifiedBy === "ai",
    "updateClip marks lastModifiedBy ai"
  );

  const keyed = timelineOps.addKeyframe(timeline, {
    clipId: clipResult.clip.id,
    property: "transform.opacity",
    frame: 0,
    value: 0,
    easing: "ease-out",
  });
  timeline = keyed.timeline;
  const withKeyframe = timelineOps.findClipLocation(
    timeline.tracks,
    clipResult.clip.id
  );
  assert(withKeyframe.clip.keyframes.length === 1, "addKeyframe adds one keyframe");
  assert(withKeyframe.clip.keyframes[0].value === 0, "addKeyframe value");

  const locatedForConflict = timelineOps.findClipLocation(
    timeline.tracks,
    clipResult.clip.id
  );
  locatedForConflict.clip.lastModifiedBy = "user";
  locatedForConflict.clip.lastModifiedAt = Date.now();

  assert(
    needsUserOverwriteConfirm(locatedForConflict.clip),
    "recent user edit needs confirm"
  );

  let conflictThrown = false;
  try {
    timelineOps.updateClip(timeline, {
      clipId: clipResult.clip.id,
      updates: { "style.fontSize": 60 },
    });
  } catch (error) {
    conflictThrown = error.message.includes("E2010");
  }
  assert(conflictThrown, "updateClip rejects without confirmOverwrite");

  const query = timelineOps.queryElement(timeline, {
    query: "Hello",
    type: "clip",
  });
  assert(query.bestMatch === clipResult.clip.id, "query should find clip");

  let deleteConflictThrown = false;
  try {
    timelineOps.deleteClip(timeline, {
      clipId: clipResult.clip.id,
    });
  } catch (error) {
    deleteConflictThrown = error.message.includes("E2010");
  }
  assert(deleteConflictThrown, "deleteClip rejects recent user edits without confirmOverwrite");

  const deleted = timelineOps.deleteClip(timeline, {
    clipId: clipResult.clip.id,
    confirmOverwrite: true,
  });
  timeline = deleted.timeline;
  assert(
    !timelineOps.findClipLocation(timeline.tracks, clipResult.clip.id),
    "deleteClip removes clip"
  );

  console.log("timeline-ops tests passed");
}

main();
