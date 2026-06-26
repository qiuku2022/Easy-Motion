export function formatAssetSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatAssetDimensions(
  width?: number,
  height?: number,
): string {
  if (!width || !height) return "—";
  return `${width}×${height}`;
}

export function formatAssetDuration(
  durationInFrames?: number,
  fps = 30,
): string {
  if (!durationInFrames || durationInFrames <= 0) return "—";
  const totalSeconds = durationInFrames / fps;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatAssetExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return name.toUpperCase();
  return name.slice(dot + 1).toUpperCase();
}
