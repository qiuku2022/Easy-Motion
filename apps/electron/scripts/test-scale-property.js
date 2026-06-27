/**
 * 缩放属性：UI 百分比 ↔ 内部倍数（100% = 1，负值 = 翻转）。
 */
const assert = require("node:assert/strict");

function scaleFromPercent(percent) {
  if (!Number.isFinite(percent)) return 1;
  return percent / 100;
}

function clampScaleInternal(value) {
  if (!Number.isFinite(value)) return 1;
  return value;
}

function scaleInternalToFormValue(value) {
  return String(Math.round(value * 100));
}

function buildScalePatch(value) {
  return { transform: { scale: clampScaleInternal(Number(value)) } };
}

function parseScaleField(formValue) {
  return scaleFromPercent(Number(formValue));
}

assert.equal(parseScaleField("100"), 1);
assert.equal(parseScaleField("150"), 1.5);
assert.equal(parseScaleField("0"), 0);
assert.equal(parseScaleField("-50"), -0.5);

const patch = buildScalePatch(1.5);
assert.equal(patch.transform.scale, 1.5, "1.5 internal must stay 1.5");

assert.equal(scaleInternalToFormValue(1.5), "150");
assert.equal(scaleInternalToFormValue(-1), "-100");

console.log("[PASS] scale-property");
