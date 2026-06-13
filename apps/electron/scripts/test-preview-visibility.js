const assert = require("node:assert/strict");
const {
  getClipTimingForPreview,
  isClipVisibleInPreview,
} = require("@easymotion/shared");

const timeline = {
  tracks: [
    {
      id: "track-text",
      type: "text",
      visible: true,
      clips: [
        {
          id: "clip-title-main",
          startInFrames: 10,
          durationInFrames: 40,
        },
      ],
    },
  ],
};

assert.equal(
  getClipTimingForPreview("clip-title-main", timeline)?.durationInFrames,
  40,
);

timeline.tracks[0].clips[0].durationInFrames = 25;
assert.equal(
  getClipTimingForPreview("clip-title-main", timeline)?.durationInFrames,
  25,
);
assert.equal(
  getClipTimingForPreview("clip-title-main", timeline)?.startInFrames,
  10,
);

timeline.tracks[0].visible = false;
assert.equal(isClipVisibleInPreview("clip-title-main", timeline), false);

console.log("preview-visibility clip timing: ok");
