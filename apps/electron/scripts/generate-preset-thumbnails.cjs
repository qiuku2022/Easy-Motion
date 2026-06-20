#!/usr/bin/env node
/**
 * Render animated WebP thumbnails for all RVE presets.
 * Uses @remotion/bundler + renderStill (system Chrome) + ffmpeg libwebp.
 *
 *   cd apps/electron && pnpm generate:preset-thumbnails
 */
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execSync } = require("node:child_process");

const { RVE_PRESET_CATALOG } = require("./rve-preset-catalog.cjs");

const ELECTRON_ROOT = path.resolve(__dirname, "..");
const REMOTION_DIR = path.join(
  ELECTRON_ROOT,
  "resources/templates/default-project/subprojects/default/remotion",
);
const THUMB_RESOURCES_DIR = path.join(ELECTRON_ROOT, "resources/presets/thumbnails");
const THUMB_PUBLIC_DIR = path.join(
  ELECTRON_ROOT,
  "src/renderer/public/presets/thumbnails",
);
const MANIFEST_PATH = path.join(ELECTRON_ROOT, "resources/presets/manifest.json");
const MANIFEST_RENDERER_PATH = path.join(
  ELECTRON_ROOT,
  "src/renderer/src/data/presets/manifest.json",
);

const ENTRY = path.join(REMOTION_DIR, "src/presets/thumbnail-entry.tsx");
const COMPOSITION_ID = "PresetThumbnail";
const WIDTH = 320;
const HEIGHT = 180;
const FPS = 15;
const FRAMES = 45;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function requireFromRemotion(packageName) {
  return require(require.resolve(packageName, { paths: [REMOTION_DIR] }));
}

function resolveBrowserExecutable() {
  if (process.env.REMOTION_BROWSER_EXECUTABLE) {
    return process.env.REMOTION_BROWSER_EXECUTABLE;
  }

  const candidates =
    process.platform === "win32"
      ? [
          path.join(process.env.ProgramFiles || "C:\\Program Files", "Google/Chrome/Application/chrome.exe"),
          path.join(
            process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
            "Google/Chrome/Application/chrome.exe",
          ),
          path.join(process.env.LOCALAPPDATA || "", "Google/Chrome/Application/chrome.exe"),
        ]
      : process.platform === "darwin"
        ? [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
          ]
        : ["/usr/bin/google-chrome", "/usr/bin/chromium-browser", "/usr/bin/chromium"];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Chrome not found. Install Google Chrome or set REMOTION_BROWSER_EXECUTABLE.",
  );
}

function hasFfmpeg() {
  try {
    execSync("ffmpeg -version", { stdio: "ignore", shell: true });
    return true;
  } catch {
    return false;
  }
}

function framesToWebp(frameDir, outputWebp) {
  const pattern = path.join(frameDir, "frame%03d.png");
  execSync(
    `ffmpeg -y -framerate ${FPS} -i "${pattern}" -vcodec libwebp -lossless 0 -q:v 78 -loop 0 -an "${outputWebp}"`,
    { stdio: "pipe", shell: true },
  );
}

function updateManifest(thumbnailById) {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  for (const item of manifest) {
    if (thumbnailById[item.id]) {
      item.thumbnail = thumbnailById[item.id];
    }
  }
  const json = `${JSON.stringify(manifest, null, 2)}\n`;
  fs.writeFileSync(MANIFEST_PATH, json, "utf8");
  fs.writeFileSync(MANIFEST_RENDERER_PATH, json, "utf8");
}

async function renderPresetThumbnail({
  serveUrl,
  renderStill,
  selectComposition,
  browserExecutable,
  item,
  outResources,
}) {
  const inputProps = { component: item.component };
  const composition = await selectComposition({
    serveUrl,
    id: COMPOSITION_ID,
    inputProps,
    logLevel: "error",
    browserExecutable,
  });

  const thumbComposition = {
    ...composition,
    width: WIDTH,
    height: HEIGHT,
    fps: FPS,
    durationInFrames: FRAMES,
  };

  const frameDir = fs.mkdtempSync(path.join(os.tmpdir(), `em-thumb-${item.id}-`));
  try {
    for (let frame = 0; frame < FRAMES; frame++) {
      await renderStill({
        serveUrl,
        composition: thumbComposition,
        inputProps,
        output: path.join(frameDir, `frame${String(frame).padStart(3, "0")}.png`),
        frame,
        imageFormat: "png",
        logLevel: "error",
        overwrite: true,
        browserExecutable,
      });
    }

    framesToWebp(frameDir, outResources);
  } finally {
    fs.rmSync(frameDir, { recursive: true, force: true });
  }
}

async function main() {
  if (!fs.existsSync(path.join(REMOTION_DIR, "node_modules"))) {
    console.log("Installing remotion template dependencies…");
    execSync("npm install --no-fund --loglevel=error", {
      cwd: REMOTION_DIR,
      stdio: "inherit",
      shell: true,
    });
  }

  if (!hasFfmpeg()) {
    console.error("ffmpeg not found on PATH.");
    process.exit(1);
  }

  const browserExecutable = resolveBrowserExecutable();
  console.log(`Using browser: ${browserExecutable}`);

  ensureDir(THUMB_RESOURCES_DIR);
  ensureDir(THUMB_PUBLIC_DIR);

  const { bundle } = requireFromRemotion("@remotion/bundler");
  const { renderStill, selectComposition, ensureBrowser } =
    requireFromRemotion("@remotion/renderer");

  await ensureBrowser(browserExecutable);

  const bundleDir = path.join(REMOTION_DIR, ".easymotion", "preset-thumbnail-bundle");
  fs.mkdirSync(bundleDir, { recursive: true });

  console.log("Bundling Remotion thumbnail entry…");
  const serveUrl = await bundle({
    entryPoint: ENTRY,
    rootDir: REMOTION_DIR,
    outDir: bundleDir,
    enableCaching: true,
    onProgress: () => {},
  });

  const thumbnailById = {};
  const failures = [];
  const skipExisting = process.argv.includes("--skip-existing");
  const onlyIdx = process.argv.indexOf("--only");
  const onlyId = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;
  const catalog = onlyId
    ? RVE_PRESET_CATALOG.filter((item) => item.id === onlyId)
    : RVE_PRESET_CATALOG;

  if (onlyId && catalog.length === 0) {
    console.error(`Unknown preset id: ${onlyId}`);
    process.exit(1);
  }

  console.log(
    `Rendering ${catalog.length} presets → WebP (${WIDTH}×${HEIGHT}, ${FRAMES} frames @ ${FPS}fps)\n`,
  );

  for (let i = 0; i < catalog.length; i++) {
    const item = catalog[i];
    const webpName = `${item.id}.webp`;
    const outResources = path.join(THUMB_RESOURCES_DIR, webpName);
    const outPublic = path.join(THUMB_PUBLIC_DIR, webpName);

    if (skipExisting && fs.existsSync(outResources) && fs.statSync(outResources).size > 0) {
      fs.copyFileSync(outResources, outPublic);
      thumbnailById[item.id] = webpName;
      console.log(`[${i + 1}/${catalog.length}] ${item.name} … skipped`);
      continue;
    }

    process.stdout.write(`[${i + 1}/${catalog.length}] ${item.name} … `);

    try {
      await renderPresetThumbnail({
        serveUrl,
        renderStill,
        selectComposition,
        browserExecutable,
        item,
        outResources,
      });

      fs.copyFileSync(outResources, outPublic);
      thumbnailById[item.id] = webpName;
      console.log("ok");
    } catch (err) {
      failures.push({ id: item.id, error: err.message || String(err) });
      console.log("FAILED");
    }
  }

  updateManifest(thumbnailById);

  console.log(`\nDone: ${Object.keys(thumbnailById).length} thumbnails.`);
  if (failures.length) {
    console.log(`Failed (${failures.length}):`);
    for (const f of failures) {
      console.log(`  - ${f.id}: ${f.error}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
