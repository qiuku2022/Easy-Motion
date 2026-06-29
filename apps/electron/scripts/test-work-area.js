const { readJsonFile } = require("../src/main/services/file-service");
const path = require("node:path");
const {
  getContentEndInclusive,
  getContentEndExclusive,
  ensureTimelineFitsClip,
  fitTimelineDuration,
  resolveTimelineViewportDuration,
  resolveExportFrameRange,
  resolveWorkAreaDisplayRange,
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
  assert(padded.durationInFrames === 150, `expected fitted duration 150 (5s min), got ${padded.durationInFrames}`);
  assert(
    resolveTimelineViewportDuration({ ...timeline, durationInFrames: 300 }) === 150,
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

  const empty = {
    version: "1.0",
    fps: 30,
    durationInFrames: 150,
    width: 1920,
    height: 1080,
    tracks: [],
  };
  const emptyIn = setWorkAreaInFrame(empty, 30);
  const emptyDisplay = resolveWorkAreaDisplayRange(emptyIn);
  assert(emptyDisplay.inFrame === 30, "empty timeline in point");
  assert(emptyDisplay.outFrame === 149, "empty timeline default out at timeline end");
  const emptyOut = setWorkAreaOutFrame(empty, 80);
  const emptyOutDisplay = resolveWorkAreaDisplayRange(emptyOut);
  assert(emptyOutDisplay.outFrame === 80, "empty timeline out not capped to content");

  const fittedEmpty = fitTimelineDuration(empty);
  assert(fittedEmpty.durationInFrames === 150, "empty timeline keeps 5s minimum");

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

  const short = { ...timeline, durationInFrames: 30 };
  const extended = ensureTimelineFitsClip(short, 0, 90);
  assert(extended.durationInFrames === 90, "ensureTimelineFitsClip extends duration");

  console.log("work-area tests passed");
}

main();
