export type ExportFormat = "mp4" | "webm" | "gif";
export type ExportResolution = "original" | "1080p" | "720p" | "480p";
export type ExportQuality = "high" | "medium" | "low";
export type ExportStatus =
  | "preparing"
  | "rendering"
  | "encoding"
  | "completed"
  | "failed";

export interface ExportStartRequest {
  projectPath: string;
  subprojectPath?: string;
  format: ExportFormat;
  resolution: ExportResolution;
  quality: ExportQuality;
  outputPath: string;
}

export interface ExportProgressPayload {
  exportId: string;
  status: ExportStatus;
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  fps: number;
  estimatedRemainingSeconds: number;
  exportInFrame?: number;
  exportOutFrame?: number;
}

export interface ExportCompletedPayload {
  exportId: string;
  outputPath: string;
  fileSize: number;
  duration: number;
}

export interface ExportErrorPayload {
  exportId: string;
  message: string;
}

export interface ProjectExportStartRequest {
  projectPath: string;
  subprojectPath?: string;
  outputZipPath: string;
  includeAssets?: boolean;
}

export type ExportKind = "video" | "project";
