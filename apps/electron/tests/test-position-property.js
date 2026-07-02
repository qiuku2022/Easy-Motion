const assert = require("node:assert/strict");

function snapPositionValue(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.round(value);
}

assert.equal(snapPositionValue(960.4), 960);
assert.equal(snapPositionValue(640.6), 641);
assert.equal(snapPositionValue("x"), 0);

console.log("[PASS] position-property");
