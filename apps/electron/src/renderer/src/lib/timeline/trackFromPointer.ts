import { TRACK_ROW_HEIGHT } from "@/lib/timeline/constants";
import type { TimelineRow } from "@/lib/timeline/trackTree";

/** Map pointer Y on the timeline body to a leaf track id (skips group header rows). */
export function trackIdFromPointer(
  clientY: number,
  container: HTMLElement,
  rows: TimelineRow[],
): string | null {
  const rect = container.getBoundingClientRect();
  const y = clientY - rect.top + container.scrollTop;
  const rowIndex = Math.floor(y / TRACK_ROW_HEIGHT);
  if (rowIndex < 0 || rowIndex >= rows.length) return null;

  const row = rows[rowIndex];
  if (row.isGroupHeader) return null;
  return row.track.id;
}
