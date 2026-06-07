import type { ProjectAsset } from "@/types/asset";
import { ASSET_DRAG_MIME } from "@/types/asset";

export function setAssetDragData(dataTransfer: DataTransfer, asset: ProjectAsset) {
  dataTransfer.setData(ASSET_DRAG_MIME, JSON.stringify({ assetId: asset.id }));
  dataTransfer.effectAllowed = "copy";
}

export function readAssetDragData(dataTransfer: DataTransfer): { assetId: string } | null {
  const raw = dataTransfer.getData(ASSET_DRAG_MIME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { assetId?: string };
    if (!parsed.assetId) return null;
    return { assetId: parsed.assetId };
  } catch {
    return null;
  }
}

export function isAssetDrag(dataTransfer: DataTransfer): boolean {
  return dataTransfer.types.includes(ASSET_DRAG_MIME);
}
