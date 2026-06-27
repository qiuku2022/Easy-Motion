/**
 * Copy resources/presets/thumbnails/*.webp → public for Vite build (dist/renderer/presets/thumbnails).
 */
const fs = require("node:fs");
const path = require("node:path");

const ELECTRON_ROOT = path.resolve(__dirname, "..");
const SOURCE_DIR = path.join(ELECTRON_ROOT, "resources/presets/thumbnails");
const PUBLIC_DIR = path.join(ELECTRON_ROOT, "src/renderer/public/presets/thumbnails");

function main() {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  const webps = fs.existsSync(SOURCE_DIR)
    ? fs.readdirSync(SOURCE_DIR).filter((name) => name.endsWith(".webp"))
    : [];

  if (webps.length === 0) {
    console.error(
      "[sync-preset-thumbnails] 未找到 WebP 缩略图。\n" +
        "  请先运行: cd apps/electron && pnpm generate:preset-thumbnails",
    );
    process.exit(1);
  }

  let copied = 0;
  for (const name of webps) {
    fs.copyFileSync(path.join(SOURCE_DIR, name), path.join(PUBLIC_DIR, name));
    copied += 1;
  }

  console.log(`[sync-preset-thumbnails] 已同步 ${copied} 个缩略图 → public/presets/thumbnails/`);
}

main();
