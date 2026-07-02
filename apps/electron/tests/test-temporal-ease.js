/**
 * AE temporal ease ↔ bezierCp 往返（与 renderer temporalEase.ts 对齐）
 */
const assert = require("node:assert/strict");

const MIN_INFLUENCE = 0.1;
const MAX_INFLUENCE = 100;
const AE_EASY_EASE = { speed: 0, influence: 33.33 };

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function clampInfluence(v) {
  return Math.max(MIN_INFLUENCE, Math.min(MAX_INFLUENCE, v));
}

function averageSpeed(prev, end, fps) {
  const v0 = Number(prev.value);
  const v1 = Number(end.value);
  const deltaF = end.frame - prev.frame;
  if (deltaF <= 0) return 0;
  return Math.abs(v1 - v0) / (deltaF / fps);
}

function temporalEasesToBezierCp(prev, end, outgoing, incoming, fps) {
  const avg = averageSpeed(prev, end, fps);
  const outInf = clampInfluence(outgoing.influence) / 100;
  const x1 = outInf;
  const y1 = avg > 0 ? (outgoing.speed / avg) * x1 : 0;
  const inInf = clampInfluence(incoming.influence) / 100;
  const x2 = 1 - inInf;
  const y2 = avg > 0 ? 1 - (incoming.speed / avg) * inInf : 1;
  return { x1: clamp01(x1), y1: clamp01(y1), x2: clamp01(x2), y2: clamp01(y2) };
}

function bezierCpToTemporalEases(prev, end, fps, cp) {
  const avg = averageSpeed(prev, end, fps);
  const outInfluence = cp.x1 * 100;
  const outSpeed = cp.x1 > 1e-6 ? (cp.y1 / cp.x1) * avg : 0;
  const inInfluence = (1 - cp.x2) * 100;
  const inInfNorm = inInfluence / 100;
  const inSpeed = inInfNorm > 1e-6 ? ((1 - cp.y2) / inInfNorm) * avg : 0;
  return {
    outgoing: { speed: outSpeed, influence: clampInfluence(outInfluence) },
    incoming: { speed: inSpeed, influence: clampInfluence(inInfluence) },
  };
}

const prev = { id: "a", property: "x", frame: 0, value: 0 };
const end = { id: "b", property: "x", frame: 30, value: 100 };
const fps = 30;

const easyCp = temporalEasesToBezierCp(prev, end, AE_EASY_EASE, AE_EASY_EASE, fps);
const roundTrip = bezierCpToTemporalEases(prev, end, fps, easyCp);

assert.ok(Math.abs(roundTrip.incoming.speed - AE_EASY_EASE.speed) < 0.01);
assert.ok(Math.abs(roundTrip.incoming.influence - AE_EASY_EASE.influence) < 0.1);
assert.ok(Math.abs(roundTrip.outgoing.speed - AE_EASY_EASE.speed) < 0.01);
assert.ok(Math.abs(roundTrip.outgoing.influence - AE_EASY_EASE.influence) < 0.1);

// Easy Ease cp 应不同于 CSS ease-in-out 默认
assert.notDeepEqual(easyCp, { x1: 0.42, y1: 0, x2: 0.58, y2: 1 });

// 线性：高 speed + 低 influence
const linearCp = temporalEasesToBezierCp(
  prev,
  end,
  { speed: averageSpeed(prev, end, fps), influence: 0.1 },
  { speed: averageSpeed(prev, end, fps), influence: 0.1 },
  fps,
);
assert.ok(linearCp.x1 < 0.05, "linear outgoing influence near 0");
assert.ok(linearCp.x2 > 0.95, "linear incoming influence near 0");

console.log("test-temporal-ease: passed");
