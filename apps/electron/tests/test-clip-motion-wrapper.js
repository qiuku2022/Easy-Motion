const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const templateLib = path.join(
  __dirname,
  "..",
  "resources",
  "templates",
  "default-project",
  "subprojects",
  "default",
  "remotion",
  "src",
  "lib",
  "clip-motion-wrapper.ts",
);

const source = fs.readFileSync(templateLib, "utf8");
assert.ok(
  source.includes("shouldWrapClipMotion"),
  "clip-motion-wrapper.ts should export shouldWrapClipMotion",
);
assert.ok(
  source.includes("resolveFillLayoutOffset"),
  "clip-motion-wrapper.ts should export resolveFillLayoutOffset",
);
assert.ok(
  !source.includes('"positioned"'),
  "clip-motion-wrapper should not switch to positioned layout",
);

const wrapperPath = path.join(
  __dirname,
  "..",
  "resources",
  "templates",
  "default-project",
  "subprojects",
  "default",
  "remotion",
  "src",
  "components",
  "layers",
  "ClipTransformWrapper.tsx",
);
const wrapperSource = fs.readFileSync(wrapperPath, "utf8");
assert.ok(
  wrapperSource.includes("resolveFillLayoutOffset"),
  "ClipTransformWrapper should pan via resolveFillLayoutOffset",
);
assert.ok(
  !wrapperSource.includes('layout === "positioned"'),
  "ClipTransformWrapper should not use positioned layout branch",
);

const mainSeq = path.join(
  __dirname,
  "..",
  "resources",
  "templates",
  "default-project",
  "subprojects",
  "default",
  "remotion",
  "src",
  "components",
  "MainSequence.tsx",
);
const mainSource = fs.readFileSync(mainSeq, "utf8");
assert.ok(
  mainSource.includes("shouldWrapClipMotion"),
  "MainSequence should use shouldWrapClipMotion for preset clips",
);
assert.ok(
  !mainSource.includes("clip.transform != null"),
  "MainSequence should not treat default transform as motion",
);

function timelineYToCssTop(y, compositionHeight) {
  const height = Number(compositionHeight);
  const snapped = Math.round(y);
  return Math.min(height, Math.max(0, Math.round(height - snapped)));
}

function resolveLayerScreenPosition(x, y, compositionHeight) {
  return {
    left: Math.round(x),
    top: timelineYToCssTop(y, compositionHeight),
  };
}

function resolveFillLayoutOffset(position, canvas) {
  const screen = resolveLayerScreenPosition(position.x, position.y, canvas.height);
  const center = resolveLayerScreenPosition(
    canvas.width / 2,
    canvas.height / 2,
    canvas.height,
  );
  return {
    x: screen.left - center.left,
    y: screen.top - center.top,
  };
}

const canvas = { width: 1920, height: 1080 };
assert.deepEqual(
  resolveFillLayoutOffset({ x: 960, y: 540 }, canvas),
  { x: 0, y: 0 },
);
assert.deepEqual(
  resolveFillLayoutOffset({ x: 1060, y: 540 }, canvas),
  { x: 100, y: 0 },
);
assert.deepEqual(
  resolveFillLayoutOffset({ x: 960, y: 640 }, canvas),
  { x: 0, y: -100 },
);

console.log("test-clip-motion-wrapper: ok");
