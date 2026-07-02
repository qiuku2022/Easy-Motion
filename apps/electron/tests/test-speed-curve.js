/**
 * 速度曲线采样：Easy Ease 端点应近 0，峰值居中。
 */
const assert = require("node:assert/strict");

function cubicBezierEaseDerivative(x1, y1, x2, y2, t) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (u) => ((ax * u + bx) * u + cx) * u;
  const derivX = (u) => (3 * ax * u + 2 * bx) * u + cx;
  const derivY = (u) => (3 * ay * u + 2 * by) * u + cy;
  const target = Math.max(0, Math.min(1, t));
  let low = 0;
  let high = 1;
  for (let i = 0; i < 14; i += 1) {
    const mid = (low + high) / 2;
    if (sampleX(mid) < target) low = mid;
    else high = mid;
  }
  const u = (low + high) / 2;
  const dx = derivX(u);
  const dy = derivY(u);
  return Math.abs(dx) > 1e-9 ? dy / dx : 0;
}

function segmentSpeed(cp, t, deltaV = 100, segFrames = 90, fps = 30) {
  const dt = segFrames / fps;
  const d = cubicBezierEaseDerivative(cp.x1, cp.y1, cp.x2, cp.y2, t);
  return (d * deltaV) / dt;
}

const aeCp = { x1: 0.333, y1: 0, x2: 0.667, y2: 1 };
const t0 = segmentSpeed(aeCp, 0);
const t1 = segmentSpeed(aeCp, 1);
assert.ok(Math.abs(t0) < 0.05, `start speed ${t0} should be ~0`);
assert.ok(Math.abs(t1) < 0.05, `end speed ${t1} should be ~0`);

let peakT = 0;
let peak = 0;
for (let i = 0; i <= 48; i += 1) {
  const t = i / 48;
  const s = segmentSpeed(aeCp, t);
  if (s > peak) {
    peak = s;
    peakT = t;
  }
}
assert.ok(peakT > 0.35 && peakT < 0.65, `peak should be centered, got t=${peakT}`);
assert.ok(peak > 30, `peak speed should exceed average (~33)`);

// 多项式 ease-in-out：速度图为折线三角（峰值在 50%）
function namedEaseInOutSpeed(t, deltaV, dt) {
  const d = t < 0.5 ? 4 * t : 4 - 4 * t;
  return (d * deltaV) / dt;
}
const s25 = namedEaseInOutSpeed(0.25, 100, 3);
const s50 = namedEaseInOutSpeed(0.5, 100, 3);
assert.ok(Math.abs(s50 / s25 - 2) < 0.01, "named ease-in-out speed is triangular");

console.log("test-speed-curve: passed");
