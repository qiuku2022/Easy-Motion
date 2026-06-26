export type AssetMediaType = "image" | "video" | "audio";

export type DuplicateAction = "skip" | "rename" | "overwrite";

export interface ProjectAsset {
  id: string;
  name: string;
  originalName: string;
  type: AssetMediaType;
  mimeType: string;
  /** 相对项目根目录，如 assets/image/uuid.png */
  path: string;
  /** Remotion staticFile 路径，如 /assets/image/uuid.png */
  publicPath: string;
  contentHash?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationInFrames?: number;
  thumbnailPath?: string;
  isFavorite?: boolean;
  usageCount?: number;
  lastUsedAt?: number;
  importedAt: number;
  isDeleted?: boolean;
}

export interface AssetDuplicateInfo {
  sourcePath: string;
  originalName: string;
  contentHash: string;
  reason: "name" | "hash";
  existingId: string;
  existingName: string;
}

export interface DuplicateResolution {
  action: DuplicateAction;
  existingId?: string;
}

export interface AssetImportResult {
  imported: ProjectAsset[];
  errors: { path?: string; message: string }[];
  skipped?: { path?: string; existingId?: string }[];
  assets: ProjectAsset[];
  duplicates?: AssetDuplicateInfo[];
  pendingFilePaths?: string[];
  needsDuplicateResolution?: boolean;
}

export const ASSET_DRAG_MIME = "application/x-easymotion-asset";

export type AssetTypeFilter = "all" | AssetMediaType;

export function assetTrackType(type: AssetMediaType): "image" | "video" | "audio" {
  return type;
}
