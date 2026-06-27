const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { BrowserWindow } = require("electron");
const timelineService = require("./timeline-service");
const {
  getRemotionDir,
  getRemotionSrcDir,
  prepareRemotionForNativeSync,
  requireFromRemotion,
  REMOTION_ENTRY,
  isTimelineDrivenPreview,
} = require("./remotion-project");
const { readTimelineManifest } = require("../importer/timeline-manifest");
const { DEFAULT_COMPOSITION_ID } = require("../importer/remotion-composition");
const { resolveBrowserExecutable } = require("../utils/remotion-browser");
const {
  resolveRemotionBinariesDirectory,
  formatExportError,
} = require("../utils/remotion-binaries");
const {
  validateExportRequest,
  mapFormatToCodec,
  mapQualityToCrf,
  resolveScale,
  estimateRequiredBytes,
  assertWritableOutput,
  assertDiskSpace,
  assertMp4Header,
} = require("./export-preflight");
const { resolveExportFrameRange } = require("@easymotion/shared");
const { exportRemotionProjectZip } = require("./project-export-service");

/** @type {{ exportId: string; kind: "video" | "project"; cancel: (() => void) | null; outputPath: string; tempPaths: string[] } | null} */
let activeExport = null;

function broadcast(channel, payload) {
  if (typeof BrowserWindow?.getAllWindows !== "function") return;
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  }
}

function emitProgress(payload) {
  broadcast("renderer:export:progress", payload);
}

function emitCompleted(payload) {
  broadcast("renderer:export:completed", payload);
}

function emitError(exportId, message) {
  broadcast("renderer:export:error", { exportId, message });
}

async function removePath(target) {
  if (!target || !fs.existsSync(target)) return;
  await fsp.rm(target, { recursive: true, force: true });
}

function buildInputProps(remotionSrcDir) {
  const manifest = readTimelineManifest(remotionSrcDir);
  if (!manifest?.timeline) {
    throw new Error("E2600: timeline manifest missing for export");
  }
  return { timeline: manifest.timeline };
}

async function prepareTimelineForExport(projectPath, subprojectPath, timeline) {
  timelineService.syncPreviewManifest(projectPath, timeline, subprojectPath);
  const remotionSrcDir = getRemotionSrcDir(
    getRemotionDir(projectPath, subprojectPath),
  );
  if (!isTimelineDrivenPreview(remotionSrcDir)) {
    timelineService.generateForSubproject(projectPath, subprojectPath);
  }
  return remotionSrcDir;
}

async function runVideoExport(request, exportId, cancelSignal) {
  const startedAt = Date.now();
  const subprojectPath = request.subprojectPath || "subprojects/default";
  const remotionDir = getRemotionDir(request.projectPath, subprojectPath);
  const remotionSrcDir = getRemotionSrcDir(remotionDir);
  const bundleDir = path.join(remotionDir, ".easymotion", `export-bundle-${exportId}`);
  const outputPath = request.outputPath;

  if (activeExport) {
    activeExport.tempPaths.push(bundleDir);
  }

  try {
    emitProgress({
      exportId,
      status: "preparing",
      currentFrame: 0,
      totalFrames: 0,
      percentage: 0,
      fps: 0,
      estimatedRemainingSeconds: 0,
    });

    await prepareRemotionForNativeSync(remotionDir);
    const timeline = timelineService.loadTimeline(request.projectPath, subprojectPath);
    await prepareTimelineForExport(request.projectPath, subprojectPath, timeline);

    const fittedTimeline = timelineService.loadTimeline(
      request.projectPath,
      subprojectPath,
    );
    const exportRange = resolveExportFrameRange(fittedTimeline);
    const frameRange = [exportRange.inFrame, exportRange.outFrame];

    const inputProps = buildInputProps(remotionSrcDir);
    const { bundle } = requireFromRemotion(remotionDir, "@remotion/bundler");
    const { selectComposition, renderMedia } =
      requireFromRemotion(remotionDir, "@remotion/renderer");

    fs.mkdirSync(bundleDir, { recursive: true });
    const entryPoint = path.join(remotionDir, "src", REMOTION_ENTRY);
    if (!fs.existsSync(entryPoint)) {
      throw new Error("E2502: remotion-entry.tsx missing");
    }

    const serveUrl = await bundle({
      entryPoint,
      rootDir: remotionDir,
      outDir: bundleDir,
      enableCaching: false,
      onProgress: ({ progress }) => {
        emitProgress({
          exportId,
          status: "preparing",
          currentFrame: 0,
          totalFrames: 0,
          percentage: Math.round(progress * 20),
          fps: 0,
          estimatedRemainingSeconds: 0,
        });
      },
    });

    const browserExecutable = resolveBrowserExecutable();
    const binariesDirectory = resolveRemotionBinariesDirectory(remotionDir);

    const composition = await selectComposition({
      serveUrl,
      id: DEFAULT_COMPOSITION_ID,
      inputProps,
      logLevel: "error",
      browserExecutable,
      binariesDirectory: binariesDirectory ?? undefined,
    });

    const scale = resolveScale(request.resolution, composition.height);
    const codec = mapFormatToCodec(request.format);
    const crf = mapQualityToCrf(request.quality);
    const totalFrames = exportRange.frameCount;
    const fps = composition.fps;
    const renderStartedAt = Date.now();
    let lastFrame = 0;

    emitProgress({
      exportId,
      status: "rendering",
      currentFrame: 0,
      totalFrames,
      percentage: 0,
      fps,
      estimatedRemainingSeconds: 0,
    });

    await renderMedia({
      composition,
      serveUrl,
      codec,
      outputLocation: outputPath,
      inputProps,
      cancelSignal,
      scale,
      crf,
      frameRange,
      logLevel: "warn",
      browserExecutable,
      binariesDirectory: binariesDirectory ?? undefined,
      onProgress: ({ progress, renderedFrames, stitchStage }) => {
        const currentFrame = renderedFrames ?? 0;
        lastFrame = currentFrame;
        const elapsed = (Date.now() - renderStartedAt) / 1000;
        const rate = elapsed > 0 ? currentFrame / elapsed : 0;
        const remainingFrames = Math.max(0, totalFrames - currentFrame);
        const estimatedRemainingSeconds =
          rate > 0 ? Math.round(remainingFrames / rate) : 0;

        emitProgress({
          exportId,
          status: stitchStage === "encoding" ? "encoding" : "rendering",
          currentFrame,
          totalFrames,
          percentage: Math.min(99, Math.round((progress ?? 0) * 100)),
          fps,
          estimatedRemainingSeconds,
          exportInFrame: exportRange.inFrame,
          exportOutFrame: exportRange.outFrame,
        });
      },
    });

    if (request.format === "mp4") {
      assertMp4Header(outputPath);
    }

    const stat = await fsp.stat(outputPath);
    const durationSec = Math.round((Date.now() - startedAt) / 1000);

    emitProgress({
      exportId,
      status: "completed",
      currentFrame: lastFrame || totalFrames,
      totalFrames,
      percentage: 100,
      fps,
      estimatedRemainingSeconds: 0,
    });

    emitCompleted({
      exportId,
      outputPath,
      fileSize: stat.size,
      duration: durationSec,
    });
  } catch (error) {
    const message = error?.message || String(error);
    if (message.includes("cancelled") || message.includes("cancel")) {
      await fsp.unlink(outputPath).catch(() => {});
      emitProgress({
        exportId,
        status: "failed",
        currentFrame: 0,
        totalFrames: 0,
        percentage: 0,
        fps: 0,
        estimatedRemainingSeconds: 0,
      });
      emitError(exportId, "E2602: export cancelled");
      return;
    }

    await fsp.unlink(outputPath).catch(() => {});
    emitProgress({
      exportId,
      status: "failed",
      currentFrame: 0,
      totalFrames: 0,
      percentage: 0,
      fps: 0,
      estimatedRemainingSeconds: 0,
    });
    emitError(exportId, formatExportError(message.startsWith("E26") ? message : `E2600: ${message}`));
  } finally {
    await removePath(bundleDir);
  }
}

async function startVideoExport(request) {
  if (activeExport) {
    throw new Error("E2600: another export is already in progress");
  }

  validateExportRequest(request);
  await assertWritableOutput(request.outputPath);

  const subprojectPath = request.subprojectPath || "subprojects/default";
  const timeline = timelineService.loadTimeline(request.projectPath, subprojectPath);
  const requiredBytes = estimateRequiredBytes(timeline, request.resolution);
  await assertDiskSpace(request.outputPath, requiredBytes);

  const exportId = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const remotionDir = getRemotionDir(request.projectPath, subprojectPath);
  await prepareRemotionForNativeSync(remotionDir);
  const { makeCancelSignal } = requireFromRemotion(remotionDir, "@remotion/renderer");
  const { cancelSignal, cancel } = makeCancelSignal();

  activeExport = {
    exportId,
    kind: "video",
    cancel,
    outputPath: request.outputPath,
    tempPaths: [],
  };

  void runVideoExport(request, exportId, cancelSignal).finally(() => {
    if (activeExport?.exportId === exportId) {
      activeExport = null;
    }
  });

  return { exportId };
}

async function cancelExport(exportId) {
  if (!activeExport || activeExport.exportId !== exportId) {
    throw new Error("E2602: export task not found or already finished");
  }
  if (activeExport.kind === "project" || !activeExport.cancel) {
    throw new Error("E2602: project export cannot be cancelled");
  }
  activeExport.cancel();
  return { cancelled: true };
}

function getActiveExport() {
  return activeExport
    ? { exportId: activeExport.exportId, kind: activeExport.kind }
    : null;
}

async function runProjectExport(request, exportId) {
  const startedAt = Date.now();
  const outputPath = request.outputZipPath;

  emitProgress({
    exportId,
    status: "preparing",
    currentFrame: 0,
    totalFrames: 0,
    percentage: 0,
    fps: 0,
    estimatedRemainingSeconds: 0,
  });

  try {
    const result = await exportRemotionProjectZip(request, {
      onProgress: (percentage) => {
        emitProgress({
          exportId,
          status: "encoding",
          currentFrame: 0,
          totalFrames: 0,
          percentage,
          fps: 0,
          estimatedRemainingSeconds: 0,
        });
      },
    });

    const durationSec = Math.round((Date.now() - startedAt) / 1000);

    emitProgress({
      exportId,
      status: "completed",
      currentFrame: 0,
      totalFrames: 0,
      percentage: 100,
      fps: 0,
      estimatedRemainingSeconds: 0,
    });

    emitCompleted({
      exportId,
      outputPath: result.zipPath,
      fileSize: result.fileSize,
      duration: durationSec,
    });
  } catch (error) {
    await fsp.unlink(outputPath).catch(() => {});
    const message = error?.message || String(error);
    emitProgress({
      exportId,
      status: "failed",
      currentFrame: 0,
      totalFrames: 0,
      percentage: 0,
      fps: 0,
      estimatedRemainingSeconds: 0,
    });
    emitError(
      exportId,
      message.startsWith("E26") ? message : `E2606: ${message}`,
    );
  }
}

async function startProjectExport(request) {
  if (activeExport) {
    throw new Error("E2600: another export is already in progress");
  }

  await assertWritableOutput(request.outputZipPath);

  const exportId = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  activeExport = {
    exportId,
    kind: "project",
    cancel: null,
    outputPath: request.outputZipPath,
    tempPaths: [],
  };

  void runProjectExport(request, exportId).finally(() => {
    if (activeExport?.exportId === exportId) {
      activeExport = null;
    }
  });

  return { exportId };
}

module.exports = {
  startVideoExport,
  startProjectExport,
  cancelExport,
  getActiveExport,
};
