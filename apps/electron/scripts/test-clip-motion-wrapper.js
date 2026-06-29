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
  source.includes("resolveClipTransformLayout"),
  "clip-motion-wrapper.ts should export resolveClipTransformLayout",
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

console.log("test-clip-motion-wrapper: ok");
