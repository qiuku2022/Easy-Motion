import { formatTimecode } from "@/lib/timecode";

/** 根据缩放选取主/次刻度间隔（帧） */
export function getRulerTickIntervals(
  pxPerFrame: number,
  fps: number,
): { majorFrames: number; minorFrames: number } {
  const candidates = [
    1,
    5,
    10,
    15,
    fps,
    fps * 2,
    fps * 5,
    fps * 10,
    fps * 30,
    fps * 60,
  ];

  let majorFrames = fps;
  for (const c of candidates) {
    if (c * pxPerFrame >= 48) {
      majorFrames = c;
      break;
    }
  }

  let minorFrames = 1;
  for (const c of [1, 5, 10, 15, fps / 2, fps].filter((n) => n >= 1)) {
    if (c * pxPerFrame >= 8 && c <= majorFrames) {
      minorFrames = Math.floor(c);
      break;
    }
  }

  return { majorFrames, minorFrames };
}

export function formatRulerLabel(frame: number, fps: number, majorFrames: number): string {
  if (majorFrames >= fps) {
    return formatTimecode(frame, fps);
  }
  return `${frame}f`;
}
