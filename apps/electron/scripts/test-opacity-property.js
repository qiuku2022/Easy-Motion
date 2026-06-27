/**
 * 透明度属性：UI 百分比 ↔ 内部 0–1，以及 patch 不二次换算。
 */
const assert = require("node:assert/strict");
const path = require("node:path");

// 与 renderer 逻辑对齐的轻量副本（Node 不跑 TS）
function opacityFromPercent(percent) {
  const clamped = Math.min(100, Math.max(0, percent));
  return clamped / 100;
}

function clampOpacityInternal(value) {
  return Math.min(1, Math.max(0, value));
}

function opacityInternalToFormValue(value) {
  return String(Math.round(Math.min(100, Math.max(0, value * 100))));
}

function buildOpacityPatch(value) {
  return { transform: { opacity: clampOpacityInternal(Number(value)) } };
}

function parseOpacityField(formValue) {
  return opacityFromPercent(Number(formValue));
}

function isSameOpacity(parsed, current) {
  return opacityInternalToFormValue(parsed) === opacityInternalToFormValue(current);
}

// 50% → 0.5 内部值
assert.equal(parseOpacityField("50"), 0.5);
assert.equal(parseOpacityField("0"), 0);
assert.equal(parseOpacityField("100"), 1);

// patch 接收的已是内部值，不能再当百分比
const patch = buildOpacityPatch(0.5);
assert.equal(patch.transform.opacity, 0.5, "0.5 internal must stay 0.5");

// 旧 bug：二次 opacityFromPercent(0.5) → 0.005
const buggy = clampOpacityInternal(opacityFromPercent(0.5));
assert.notEqual(buggy, 0.5, "sanity: percent-of-internal is wrong");

// commit 比较：表单 50 与当前 1.0 应判定为不同
assert.equal(isSameOpacity(0.5, 1), false);
assert.equal(isSameOpacity(0.5, 0.5), true);
assert.equal(isSameOpacity(1, 0.995), true, "rounding tolerance at 100%");

console.log("[PASS] opacity-property");
