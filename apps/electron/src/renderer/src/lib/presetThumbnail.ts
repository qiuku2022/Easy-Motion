/** Preset thumbnail URLs served from Vite `public/presets/thumbnails/`. */
export function presetThumbnailSrc(thumbnail: string | null | undefined): string | null {
  if (!thumbnail) return null;
  const name = thumbnail.includes("/") ? thumbnail.split("/").pop()! : thumbnail;
  return `/presets/thumbnails/${name}`;
}
