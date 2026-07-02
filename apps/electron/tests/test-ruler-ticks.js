/**
 * 时间线标尺：PR 式 SMPTE 标签 + 缩放自适应间隔
 */
const assert = require("node:assert/strict");

const LABEL_INTERVALS_SEC = [
  0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1800, 3600,
];
const MIN_MINOR_PX = 8;
const MIN_LABEL_PX = 80;
const MAX_TICKS = 100;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatSmpteTimecode(frame, fps, options = {}) {
  const safeFps = Math.max(1, Math.round(fps));
  const f = Math.max(0, Math.floor(frame));
  const ff = f % safeFps;
  const totalSeconds = Math.floor(f / safeFps);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  const showHours = options.showHours ?? h > 0;
  if (showHours) {
    return `${pad2(h)}:${pad2(m)}:${pad2(s)}:${pad2(ff)}`;
  }
  return `${pad2(m)}:${pad2(s)}:${pad2(ff)}`;
}

function buildFrameCandidates(fps) {
  const safeFps = Math.max(1, Math.round(fps));
  const set = new Set();
  for (const f of [1, 2, 5, 10, 15]) set.add(f);
  for (const sec of LABEL_INTERVALS_SEC) {
    set.add(Math.max(1, Math.round(sec * safeFps)));
  }
  return [...set].sort((a, b) => a - b);
}

function getRulerTickIntervals(pxPerFrame, fps, durationInFrames) {
  const candidates = buildFrameCandidates(fps);
  let labelFrames = candidates[candidates.length - 1];
  for (const c of candidates) {
    if (c * pxPerFrame >= MIN_LABEL_PX) {
      labelFrames = c;
      break;
    }
  }
  const divisors = candidates.filter(
    (c) => c < labelFrames && labelFrames % c === 0,
  );
  let minorFrames = 1;
  for (let i = divisors.length - 1; i >= 0; i -= 1) {
    const c = divisors[i];
    if (c * pxPerFrame >= MIN_MINOR_PX) {
      minorFrames = c;
      break;
    }
  }
  if (labelFrames * pxPerFrame >= MIN_MINOR_PX && minorFrames === 1) {
    minorFrames = labelFrames;
  }
  if (durationInFrames > 0 && durationInFrames / minorFrames > MAX_TICKS) {
    const needed = Math.ceil(durationInFrames / MAX_TICKS);
    minorFrames = Math.max(minorFrames, needed);
  }
  if (minorFrames > labelFrames) {
    const coarser = candidates.filter((c) => c >= minorFrames);
    labelFrames =
      coarser.find((c) => c * pxPerFrame >= MIN_LABEL_PX) ??
      coarser[coarser.length - 1] ??
      minorFrames;
    if (labelFrames < minorFrames) labelFrames = minorFrames;
  }
  return { labelFrames, minorFrames };
}

function buildRulerTicks(durationInFrames, pxPerFrame, fps) {
  const { labelFrames, minorFrames } = getRulerTickIntervals(
    pxPerFrame,
    fps,
    durationInFrames,
  );
  const items = [];
  for (let frame = 0; frame <= durationInFrames; frame += minorFrames) {
    items.push({
      frame,
      kind: frame % labelFrames === 0 ? "labeled" : "minor",
    });
  }
  return items;
}

function main() {
  assert.equal(formatSmpteTimecode(0, 30), "00:00:00");
  assert.equal(formatSmpteTimecode(152, 30), "00:05:02");
  assert.equal(formatSmpteTimecode(3600 * 30, 30), "01:00:00:00");

  const zoomedIn = getRulerTickIntervals(16, 30, 300);
  assert.equal(zoomedIn.labelFrames, 5, "16px/帧 → 标签约每 5 帧");
  assert.ok(zoomedIn.minorFrames <= zoomedIn.labelFrames);

  const zoomedOut = getRulerTickIntervals(2, 30, 9000);
  assert.ok(zoomedOut.labelFrames >= 30, "缩小后标签至少 1 秒");
  assert.ok(zoomedOut.labelFrames * 2 >= MIN_LABEL_PX);

  const ticks = buildRulerTicks(300, 4, 30);
  assert.ok(ticks.length <= MAX_TICKS + 1);
  assert.equal(ticks[0].kind, "labeled");
  assert.ok(ticks.some((t) => t.kind === "minor"), "应有细刻度");

  const labels = ticks.filter((t) => t.kind === "labeled");
  for (const { frame } of labels) {
    assert.match(formatSmpteTimecode(frame, 30), /^\d{2}:\d{2}:\d{2}$/);
  }

  const longSeq = buildRulerTicks(30 * 3600, 1, 30);
  assert.ok(longSeq.length <= MAX_TICKS + 1, "长序列刻度上限");

  console.log("test-ruler-ticks: ok");
}

main();
