const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const {
  getRemotionDir,
  getRemotionSrcDir,
  prepareRemotionForNativeSync,
  requireFromRemotion,
  REMOTION_ENTRY,
  isTimelineDrivenPreview,
} = require("./remotion-project");
const { DEFAULT_COMPOSITION_ID } = require("../importer/remotion-composition");
const { resolveBrowserExecutable } = require("../utils/remotion-browser");
const { resolveRemotionBinariesDirectory } = require("../utils/remotion-binaries");

function getRemotionEntryPoint(remotionDir) {
  return path.join(remotionDir, "src", REMOTION_ENTRY);
}

function assertRemotionEntry(remotionDir) {
  const entryPoint = getRemotionEntryPoint(remotionDir);
  if (!fs.existsSync(entryPoint)) {
    throw new Error("E2502: remotion-entry.tsx missing");
  }
  return entryPoint;
}

function loadNativeRenderModules(remotionDir, overrides = {}) {
  const bundler =
    overrides.bundler ??
    (overrides.bundle ? null : requireFromRemotion(remotionDir, "@remotion/bundler"));
  const renderer =
    overrides.renderer ??
    (overrides.selectComposition && overrides.renderStill
      ? null
      : requireFromRemotion(remotionDir, "@remotion/renderer"));
  return {
    bundle: overrides.bundle ?? bundler?.bundle,
    selectComposition: overrides.selectComposition ?? renderer?.selectComposition,
    renderStill: overrides.renderStill ?? renderer?.renderStill,
    renderMedia: overrides.renderMedia ?? renderer?.renderMedia,
    makeCancelSignal: overrides.makeCancelSignal ?? renderer?.makeCancelSignal,
  };
}

function resolveNativeRenderRuntime(remotionDir, overrides = {}) {
  const browserExecutable =
    overrides.browserExecutable === undefined
      ? resolveBrowserExecutable()
      : overrides.browserExecutable;
  const binariesDirectory =
    overrides.binariesDirectory === undefined
      ? resolveRemotionBinariesDirectory(remotionDir)
      : overrides.binariesDirectory;

  return {
    browserExecutable,
    binariesDirectory,
  };
}

async function bundleRemotionProject({
  remotionDir,
  bundleDir,
  bundle,
  enableCaching = false,
  onProgress,
}) {
  const entryPoint = assertRemotionEntry(remotionDir);
  fs.mkdirSync(bundleDir, { recursive: true });
  return bundle({
    entryPoint,
    rootDir: remotionDir,
    outDir: bundleDir,
    enableCaching,
    onProgress,
  });
}

async function selectMainComposition({
  remotionDir: _remotionDir,
  serveUrl,
  inputProps,
  selectComposition,
  compositionId = DEFAULT_COMPOSITION_ID,
  logLevel = "error",
  browserExecutable,
  binariesDirectory,
}) {
  return selectComposition({
    serveUrl,
    id: compositionId,
    inputProps,
    logLevel,
    browserExecutable,
    binariesDirectory: binariesDirectory ?? undefined,
  });
}

async function removeNativeBundleDir(bundleDir) {
  if (!bundleDir || !fs.existsSync(bundleDir)) return;
  await fsp.rm(bundleDir, { recursive: true, force: true });
}

module.exports = {
  DEFAULT_COMPOSITION_ID,
  REMOTION_ENTRY,
  getRemotionDir,
  getRemotionSrcDir,
  isTimelineDrivenPreview,
  prepareRemotionForNativeSync,
  requireFromRemotion,
  getRemotionEntryPoint,
  assertRemotionEntry,
  loadNativeRenderModules,
  resolveNativeRenderRuntime,
  bundleRemotionProject,
  selectMainComposition,
  removeNativeBundleDir,
};
