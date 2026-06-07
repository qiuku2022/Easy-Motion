const fs = require("node:fs");
const path = require("node:path");
const {
  prepareRemotionForNativeSync,
  requireFromRemotion,
  REMOTION_ENTRY,
} = require("../services/remotion-project");

const DEFAULT_COMPOSITION_ID = "Main";

/**
 * Remotion 官方路径：bundle(entryPoint) + selectComposition()
 * @see docs/Remotion-API/bundle.md
 * @see docs/Remotion-API/renderer/select-composition.md
 */
async function evaluateMainComposition(remotionDir, options = {}) {
  const compositionId = options.compositionId ?? DEFAULT_COMPOSITION_ID;
  await prepareRemotionForNativeSync(remotionDir);

  const entryPoint = path.join(remotionDir, "src", REMOTION_ENTRY);
  if (!fs.existsSync(entryPoint)) {
    throw new Error("E2502: remotion-entry.tsx missing (Remotion registerRoot entry)");
  }

  const { bundle } = requireFromRemotion(remotionDir, "@remotion/bundler");
  const { selectComposition } = requireFromRemotion(remotionDir, "@remotion/renderer");

  const bundleDir = path.join(remotionDir, ".easymotion", "bundle");
  fs.mkdirSync(bundleDir, { recursive: true });

  const serveUrl = await bundle({
    entryPoint,
    rootDir: remotionDir,
    outDir: bundleDir,
    enableCaching: true,
    onProgress: options.onProgress,
  });

  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    inputProps: options.inputProps ?? {},
    logLevel: options.logLevel ?? "error",
  });

  return {
    id: composition.id,
    fps: composition.fps,
    width: composition.width,
    height: composition.height,
    durationInFrames: composition.durationInFrames,
    defaultProps: composition.defaultProps,
    props: composition.props,
  };
}

module.exports = {
  DEFAULT_COMPOSITION_ID,
  evaluateMainComposition,
};
