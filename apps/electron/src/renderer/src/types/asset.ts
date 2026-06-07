export type AssetMediaType = "image" | "video" | "audio";

export interface ProjectAsset {
  id: string;
  name: string;
  originalName: string;
  type: AssetMediaType;
  mimeType: string;
  /** 相对项目根目录，如 assets/images/uuid.png */
  path: string;
  /** Remotion staticFile 路径，如 /assets/images/uuid.png */
  publicPath: string;
  width?: number;
  height?: number;
  durationInFrames?: number;
  importedAt: number;
  isDeleted?: boolean;
}

export const ASSET_DRAG_MIME = "application/x-easymotion-asset";

export function assetTrackType(type: AssetMediaType): "image" | "video" | "audio" {
  return type;
}
