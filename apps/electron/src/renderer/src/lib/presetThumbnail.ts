/** Preset thumbnails from Vite `public/presets/thumbnails/` (base `./` for packaged file://). */
export function presetThumbnailSrc(thumbnail: string | null | undefined): string | null {
  if (!thumbnail) return null;
  const name = thumbnail.includes("/") ? thumbnail.split("/").pop()! : thumbnail;
  const base = import.meta.env.BASE_URL ?? "./";
  return `${base}presets/thumbnails/${name}`;
}
