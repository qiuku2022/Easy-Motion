const { readJsonFile } = require("../src/main/services/file-service");
const path = require("node:path");
const {
  getContentEndInclusive,
  getContentEndExclusive,
  fitTimelineDuration,
  resolveTimelineViewportDuration,
  resolveExportFrameRange,
  setWorkAreaInFrame,
  setWorkAreaOutFrame,
  clearWorkArea,
} = require("@easymotion/shared");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const timeline = readJsonFile(
    path.join(__dirname, "../../../packages/shared/fixtures/sample-timeline.json"),
  );

  const contentEnd = getContentEndInclusive(timeline);
  assert(contentEnd === 89, `expected content end 89, got ${contentEnd}`);
  assert(getContentEndExclusive(timeline) === 90, "content end exclusive");

  const padded = fitTimelineDuration({ ...timeline, durationInFrames: 300 });
  assert(padded.durationInFrames === 120, `expected fitted duration 120, got ${padded.durationInFrames}`);
  assert(
    resolveTimelineViewportDuration({ ...timeline, durationInFrames: 300 }) === 120,
    "viewport duration",
  );

  const autoRange = resolveExportFrameRange(timeline);
  assert(autoRange.inFrame === 0, "auto in");
  assert(autoRange.outFrame === 89, "auto out at content end");
  assert(autoRange.frameCount === 90, "auto frame count");
  assert(autoRange.custom === false, "not custom");

  const withIn = setWorkAreaInFrame(timeline, 30);
  const customRange = resolveExportFrameRange(withIn);
  assert(customRange.inFrame === 30, "custom in");
  assert(customRange.outFrame === 89, "custom out keeps content end default");

  const withIo = setWorkAreaOutFrame(withIn, 45);
  const ioRange = resolveExportFrameRange(withIo);
  assert(ioRange.inFrame === 30 && ioRange.outFrame === 45, "explicit io");
  assert(ioRange.custom === true, "custom flag");

  const pastContent = setWorkAreaOutFrame(timeline, 200);
  const cappedRange = resolveExportFrameRange(pastContent);
  assert(cappedRange.outFrame === 89, "export out capped to content end");

  const swapped = setWorkAreaInFrame(withIo, 60);
  const swappedRange = resolveExportFrameRange(swapped);
  assert(swappedRange.inFrame === 45 && swappedRange.outFrame === 60, "swap in/out");

  const cleared = clearWorkArea(withIo);
  assert(!cleared.workArea, "cleared work area");

  console.log("work-area tests passed");
}

main();
