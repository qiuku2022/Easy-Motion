import type { PresetDefinition } from "@/types/preset";
import { PRESET_DRAG_MIME } from "@/types/preset";

export function setPresetDragData(
  dataTransfer: DataTransfer,
  preset: PresetDefinition,
  dragImageEl?: HTMLElement | null,
) {
  dataTransfer.setData(
    PRESET_DRAG_MIME,
    JSON.stringify({ presetId: preset.id }),
  );
  dataTransfer.effectAllowed = "copy";
  if (dragImageEl) {
    dataTransfer.setDragImage(dragImageEl, dragImageEl.offsetWidth / 2, dragImageEl.offsetHeight / 2);
  }
}

export function readPresetDragData(
  dataTransfer: DataTransfer,
): { presetId: string } | null {
  const raw = dataTransfer.getData(PRESET_DRAG_MIME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { presetId?: string };
    if (!parsed.presetId) return null;
    return { presetId: parsed.presetId };
  } catch {
    return null;
  }
}

export function isPresetDrag(dataTransfer: DataTransfer): boolean {
  return dataTransfer.types.includes(PRESET_DRAG_MIME);
}
