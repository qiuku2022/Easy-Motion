const assert = require("node:assert/strict");
const {
  timelineYToCssTop,
  resolveLayerScreenPosition,
  clampTimelinePosition,
  migrateTimelineToBottomLeft,
} = require("@easymotion/shared");

assert.equal(timelineYToCssTop(0, 1080), 1080);
assert.equal(timelineYToCssTop(1080, 1080), 0);
assert.equal(timelineYToCssTop(540, 1080), 540);

const screen = resolveLayerScreenPosition(960, 540, 1080);
assert.equal(screen.left, 960);
assert.equal(screen.top, 540);

const clamped = clampTimelinePosition(2000, -10, 1920, 1080);
assert.equal(clamped.x, 1920);
assert.equal(clamped.y, 0);

const legacy = {
  width: 1920,
  height: 1080,
  tracks: [
    {
      id: "t1",
      type: "text",
      clips: [
        {
          id: "c1",
          transform: { position: { x: 960, y: 100 } },
          keyframes: [{ id: "kf1", property: "transform.position.y", frame: 0, value: 200 }],
        },
      ],
    },
  ],
};

const migrated = migrateTimelineToBottomLeft(legacy);
assert.equal(migrated.migrated, true);
assert.equal(migrated.timeline.coordinateOrigin, "bottom-left");
assert.equal(migrated.timeline.tracks[0].clips[0].transform.position.y, 980);
assert.equal(migrated.timeline.tracks[0].clips[0].keyframes[0].value, 880);

const again = migrateTimelineToBottomLeft(migrated.timeline);
assert.equal(again.migrated, false);

console.log("[PASS] coordinates");
