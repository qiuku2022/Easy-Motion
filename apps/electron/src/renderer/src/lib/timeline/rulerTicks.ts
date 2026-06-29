import {
  formatFrameCount,
  formatSmpteTimecode,
} from "@/lib/timecode";

/** 细刻度最小像素间距（PR 缩放后仍可见的短 tick） */
const MIN_MINOR_PX = 8;
/** 带数字大刻度最小间距（防标签重叠，对齐常见 NLE ~72–96px） */
const MIN_LABEL_PX = 80;
/** 限制 DOM 节点数量 */
const MAX_TICKS = 100;

/** 秒级候选 → 帧（Premiere 标尺随缩放在帧/秒/分之间切换） */
const LABEL_INTERVALS_SEC = [
  0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1800, 3600,
];

export type RulerDisplayMode = "timecode" | "frames";

export type RulerTickKind = "minor" | "labeled";

export interface RulerTick {
  frame: number;
  kind: RulerTickKind;
}

export interface RulerIntervals {
  labelFrames: number;
  minorFrames: number;
}

function buildFrameCandidates(fps: number): number[] {
  const safeFps = Math.max(1, Math.round(fps));
  const set = new Set<number>();
  for (const f of [1, 2, 5, 10, 15]) {
    set.add(f);
  }
  for (const sec of LABEL_INTERVALS_SEC) {
    const frames = Math.max(1, Math.round(sec * safeFps));
    set.add(frames);
  }
  return [...set].sort((a, b) => a - b);
}

function pickLabelFrames(candidates: number[], pxPerFrame: number): number {
  for (const c of candidates) {
    if (c * pxPerFrame >= MIN_LABEL_PX) {
      return c;
    }
  }
  return candidates[candidates.length - 1] ?? 1;
}

function pickMinorFrames(
  candidates: number[],
  labelFrames: number,
  pxPerFrame: number,
): number {
  const divisors = candidates.filter(
    (c) => c < labelFrames && labelFrames % c === 0,
  );
  for (let i = divisors.length - 1; i >= 0; i -= 1) {
    const c = divisors[i];
    if (c * pxPerFrame >= MIN_MINOR_PX) {
      return c;
    }
  }
  if (labelFrames * pxPerFrame >= MIN_MINOR_PX) {
    return labelFrames;
  }
  return 1;
}

function capMinorFrames(
  minorFrames: number,
  durationInFrames: number,
): number {
  if (durationInFrames <= 0) return minorFrames;
  if (durationInFrames / minorFrames <= MAX_TICKS) {
    return minorFrames;
  }
  const needed = Math.ceil(durationInFrames / MAX_TICKS);
  let capped = minorFrames;
  while (capped < needed && capped * 2 <= durationInFrames) {
    capped *= 2;
  }
  return Math.max(minorFrames, needed);
}

/** 根据缩放选取标签/细刻度间隔（帧） */
export function getRulerTickIntervals(
  pxPerFrame: number,
  fps: number,
  durationInFrames?: number,
): RulerIntervals {
  const candidates = buildFrameCandidates(fps);
  const labelFrames = pickLabelFrames(candidates, pxPerFrame);
  let minorFrames = pickMinorFrames(candidates, labelFrames, pxPerFrame);

  if (durationInFrames != null && durationInFrames > 0) {
    minorFrames = capMinorFrames(minorFrames, durationInFrames);
    if (minorFrames > labelFrames) {
      const coarser = candidates.filter((c) => c >= minorFrames);
      labelFrames =
        coarser.find((c) => c * pxPerFrame >= MIN_LABEL_PX) ??
        coarser[coarser.length - 1] ??
        minorFrames;
      if (labelFrames < minorFrames) {
        labelFrames = minorFrames;
      }
    }
  }

  return { labelFrames, minorFrames };
}

/** @deprecated 使用 getRulerTickIntervals 的 labelFrames */
export function getRulerMajorFrames(
  pxPerFrame: number,
  fps: number,
  durationInFrames?: number,
): number {
  return getRulerTickIntervals(pxPerFrame, fps, durationInFrames).labelFrames;
}

/** 生成标尺刻度 */
export function buildRulerTicks(
  durationInFrames: number,
  pxPerFrame: number,
  fps: number,
): RulerTick[] {
  const { labelFrames, minorFrames } = getRulerTickIntervals(
    pxPerFrame,
    fps,
    durationInFrames,
  );

  const items: RulerTick[] = [];
  for (let frame = 0; frame <= durationInFrames; frame += minorFrames) {
    const isLabeled = frame % labelFrames === 0;
    items.push({
      frame,
      kind: isLabeled ? "labeled" : "minor",
    });
  }
  return items;
}

/** Premiere 标尺标签：默认 SMPTE；帧模式为纯帧号 */
export function formatRulerLabel(
  frame: number,
  fps: number,
  displayMode: RulerDisplayMode = "timecode",
): string {
  if (displayMode === "frames") {
    return formatFrameCount(frame);
  }
  return formatSmpteTimecode(frame, fps);
}
