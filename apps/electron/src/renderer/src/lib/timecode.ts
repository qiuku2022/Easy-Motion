const pad2 = (n: number) => String(n).padStart(2, "0");

export function formatTimecode(frame: number, fps: number): string {
  const totalSeconds = Math.floor(frame / fps);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

/** Premiere 序列默认：非丢帧 SMPTE（HH:）MM:SS:FF */
export function formatSmpteTimecode(
  frame: number,
  fps: number,
  options?: { showHours?: boolean },
): string {
  const safeFps = Math.max(1, Math.round(fps));
  const f = Math.max(0, Math.floor(frame));
  const ff = f % safeFps;
  const totalSeconds = Math.floor(f / safeFps);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);

  const showHours = options?.showHours ?? h > 0;
  if (showHours) {
    return `${pad2(h)}:${pad2(m)}:${pad2(s)}:${pad2(ff)}`;
  }
  return `${pad2(m)}:${pad2(s)}:${pad2(ff)}`;
}

/** 标尺帧计数模式（PR Ctrl+点击时间码切换） */
export function formatFrameCount(frame: number): string {
  return String(Math.max(0, Math.floor(frame)));
}

export function formatFrameRange(current: number, total: number, fps: number): string {
  return `${current}/${total} 帧 · ${formatTimecode(current, fps)} / ${formatTimecode(total, fps)}`;
}
