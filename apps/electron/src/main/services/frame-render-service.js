const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { validateTimeline, fitTimelineDuration } = require("@easymotion/shared");
const timelineService = require("./timeline-service");
const exportService = require("./export-service");
const {
  getRemotionDir,
  getRemotionSrcDir,
  prepareRemotionForNativeSync,
  loadNativeRenderModules,
  resolveNativeRenderRuntime,
  bundleRemotionProject,
  selectMainComposition,
  removeNativeBundleDir,
} = require("./remotion-native-render");
const { ensureLayerKeyframesImport } = require("./remotion-project");
const {
  ensurePreviewSoloSupport,
  ensureCustomComponentSupport,
} = require("./preview-service");
const { MANIFEST_FILE, writeTimelineManifest } = require("../importer/timeline-manifest");

const DEFAULT_SUBPROJECT_PATH = "subprojects/default";
const AGENT_FRAMES_DIR = path.join(".easymotion", "agent-frames");
const PREVIEW_CONFIG_FILE = "preview-config.json";
const DEFAULT_MAX_FRAME_RENDERS = 50;
const DEFAULT_MAX_CACHE_BYTES = 100 * 1024 * 1024;
const ALLOWED_SCALES = new Set([0.5, 1]);
const DEFAULT_BUNDLE_TIMEOUT_MS = 60_000;
const DEFAULT_RENDER_TIMEOUT_MS = 45_000;

/** @type {{ renderId: string; startedAt: number; frame: number } | null} */
let activeFrameRender = null;
const frameRenders = new Map();

function createRenderId(now = Date.now()) {
  return `frame-${now}-${crypto.randomBytes(3).toString("hex")}`;
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function isPathInside(parentDir, childPath) {
  const parent = path.resolve(parentDir);
  const child = path.resolve(childPath);
  const relative = path.relative(parent, child);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function assertAgentFramesDir(projectPath, subprojectPath) {
  const subprojectDir = path.resolve(projectPath, subprojectPath);
  const framesDir = path.resolve(subprojectDir, AGENT_FRAMES_DIR);
  if (!isPathInside(subprojectDir, framesDir)) {
    throw new Error("E2600: invalid agent frames directory");
  }
  return { subprojectDir, framesDir };
}

function normalizeScale(scale) {
  const value = scale === undefined ? 1 : Number(scale);
  if (!ALLOWED_SCALES.has(value)) {
    throw new Error("E2604: frame render scale must be 0.5 or 1");
  }
  return value;
}

function normalizeFrame(frame, timeline) {
  if (!Number.isInteger(frame)) {
    throw new Error("E2604: frame must be an integer");
  }
  if (frame < 0) {
    throw new Error("E2604: frame must be >= 0");
  }
  const maxFrame = Math.max(0, timeline.durationInFrames - 1);
  if (frame > maxFrame) {
    throw new Error(`E2604: frame ${frame} exceeds timeline duration ${maxFrame}`);
  }
  return frame;
}

function normalizeTimeline(timeline) {
  const fitted = fitTimelineDuration(timeline);
  validateTimeline(fitted);
  return fitted;
}

function writePreviewConfig(remotionSrcDir, timeline) {
  const previewConfig = {
    durationInFrames: timeline.durationInFrames,
    fps: timeline.fps,
    width: timeline.width,
    height: timeline.height,
  };
  fs.writeFileSync(
    path.join(remotionSrcDir, PREVIEW_CONFIG_FILE),
    `${JSON.stringify(previewConfig, null, 2)}\n`,
    "utf8"
  );
}

function snapshotFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { exists: false, content: null };
  }
  return { exists: true, content: fs.readFileSync(filePath, "utf8") };
}

function restoreFile(filePath, snapshot) {
  if (snapshot.exists) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, snapshot.content, "utf8");
    return;
  }
  fs.rmSync(filePath, { force: true });
}

async function withTemporaryTimelineFiles(remotionSrcDir, timeline, work) {
  const manifestPath = path.join(remotionSrcDir, MANIFEST_FILE);
  const previewConfigPath = path.join(remotionSrcDir, PREVIEW_CONFIG_FILE);
  const manifestSnapshot = snapshotFile(manifestPath);
  const previewConfigSnapshot = snapshotFile(previewConfigPath);

  writeTimelineManifest(remotionSrcDir, timeline, "agent-frame-render");
  writePreviewConfig(remotionSrcDir, timeline);

  try {
    return await work();
  } finally {
    restoreFile(manifestPath, manifestSnapshot);
    restoreFile(previewConfigPath, previewConfigSnapshot);
  }
}

function withTimeout(promise, timeoutMs, label) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`E2600: ${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  const stream = fs.createReadStream(filePath);
  await new Promise((resolve, reject) => {
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

function resolveTimeline(request, services, options) {
  if (request.timeline) {
    return request.timeline;
  }
  if (options.allowTimelineFallback) {
    return services.timelineService.loadTimeline(request.projectPath, request.subprojectPath);
  }
  throw new Error("E2604: timeline is required for frame render");
}

function ensureFrameRenderRuntimeSupport(remotionDir) {
  ensureLayerKeyframesImport(remotionDir);
  ensurePreviewSoloSupport(remotionDir);
  ensureCustomComponentSupport(remotionDir);
}

function createMetadata({
  renderId,
  frame,
  scale,
  imagePath,
  subprojectDir,
  subprojectPath,
  timeline,
  composition,
  stat,
  sha256,
}) {
  const imageRelativePath = toPosixPath(path.relative(subprojectDir, imagePath));
  const width = Math.round((composition.width ?? timeline.width) * scale);
  const height = Math.round((composition.height ?? timeline.height) * scale);
  return {
    renderId,
    frame,
    subprojectPath,
    image: {
      relativePath: imageRelativePath,
      absolutePath: imagePath,
      mime: "image/png",
      width,
      height,
      bytes: stat.size,
      sha256,
    },
    timelineSummary: {
      fps: timeline.fps,
      durationInFrames: timeline.durationInFrames,
      width: timeline.width,
      height: timeline.height,
    },
    createdAt: Date.now(),
  };
}

async function cleanupFrameRenders(projectPath, subprojectPath = DEFAULT_SUBPROJECT_PATH, options = {}) {
  const { framesDir } = assertAgentFramesDir(projectPath, subprojectPath);
  if (!fs.existsSync(framesDir)) return { deleted: 0, bytesDeleted: 0 };

  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FRAME_RENDERS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_CACHE_BYTES;
  const files = fs
    .readdirSync(framesDir)
    .filter((name) => name.endsWith(".png"))
    .map((name) => {
      const filePath = path.join(framesDir, name);
      const stat = fs.statSync(filePath);
      const metadataPath = filePath.replace(/\.png$/, ".json");
      const metadataSize = fs.existsSync(metadataPath) ? fs.statSync(metadataPath).size : 0;
      return {
        filePath,
        metadataPath,
        mtimeMs: stat.mtimeMs,
        bytes: stat.size + metadataSize,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  let totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);
  let deleted = 0;
  let bytesDeleted = 0;

  for (let index = files.length - 1; index >= 0; index -= 1) {
    const file = files[index];
    const overCount = index >= maxFiles;
    const overBytes = totalBytes > maxBytes;
    if (!overCount && !overBytes) continue;

    await fsp.rm(file.filePath, { force: true });
    await fsp.rm(file.metadataPath, { force: true });
    totalBytes -= file.bytes;
    deleted += 1;
    bytesDeleted += file.bytes;
  }

  return { deleted, bytesDeleted };
}

async function renderFrame(request, options = {}) {
  const services = {
    timelineService: options.timelineService ?? timelineService,
    exportService: options.exportService ?? exportService,
  };
  const subprojectPath = request.subprojectPath || DEFAULT_SUBPROJECT_PATH;
  const projectPath = request.projectPath;
  if (!projectPath) {
    throw new Error("E2604: projectPath is required");
  }
  if (activeFrameRender) {
    throw new Error("E2600: another frame render is already in progress");
  }
  if (services.exportService.getActiveExport?.()) {
    throw new Error("E2600: export is in progress, frame render is unavailable");
  }

  const timeline = normalizeTimeline(
    resolveTimeline({ ...request, subprojectPath }, services, options)
  );
  const frame = normalizeFrame(request.frame ?? 0, timeline);
  const scale = normalizeScale(request.scale);
  const renderId = options.renderId ?? createRenderId(options.now?.() ?? Date.now());
  const remotionDir = getRemotionDir(projectPath, subprojectPath);
  const remotionSrcDir = getRemotionSrcDir(remotionDir);
  const { subprojectDir, framesDir } = assertAgentFramesDir(projectPath, subprojectPath);
  const imagePath = path.join(framesDir, `${renderId}.png`);
  const metadataPath = path.join(framesDir, `${renderId}.json`);
  const bundleDir = path.join(remotionDir, ".easymotion", `frame-bundle-${renderId}`);
  const inputProps = { timeline };

  activeFrameRender = { renderId, startedAt: Date.now(), frame };

  try {
    fs.mkdirSync(framesDir, { recursive: true });
    await (options.prepareRemotionForNativeSync ?? prepareRemotionForNativeSync)(
      remotionDir
    );
    (options.ensureFrameRenderRuntimeSupport ?? ensureFrameRenderRuntimeSupport)(
      remotionDir
    );

    const native = loadNativeRenderModules(remotionDir, options.nativeRender ?? {});
    const runtime = resolveNativeRenderRuntime(remotionDir, options.nativeRuntime ?? {});

    const serveUrl = await withTemporaryTimelineFiles(remotionSrcDir, timeline, () =>
      withTimeout(
        bundleRemotionProject({
          remotionDir,
          bundleDir,
          bundle: native.bundle,
          enableCaching: false,
          onProgress: options.onBundleProgress,
        }),
        options.bundleTimeoutMs ?? DEFAULT_BUNDLE_TIMEOUT_MS,
        "frame bundle"
      )
    );

    const composition = await selectMainComposition({
      remotionDir,
      serveUrl,
      inputProps,
      selectComposition: native.selectComposition,
      browserExecutable: runtime.browserExecutable,
      binariesDirectory: runtime.binariesDirectory,
    });

    await withTimeout(
      native.renderStill({
        composition,
        serveUrl,
        output: imagePath,
        frame,
        imageFormat: "png",
        inputProps,
        overwrite: true,
        scale,
        logLevel: "warn",
        browserExecutable: runtime.browserExecutable,
        binariesDirectory: runtime.binariesDirectory ?? undefined,
      }),
      options.renderTimeoutMs ?? DEFAULT_RENDER_TIMEOUT_MS,
      "renderStill"
    );

    const stat = await fsp.stat(imagePath);
    const metadata = createMetadata({
      renderId,
      frame,
      scale,
      imagePath,
      subprojectDir,
      subprojectPath,
      timeline,
      composition,
      stat,
      sha256: await sha256File(imagePath),
    });
    fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
    frameRenders.set(renderId, metadata);
    cleanupFrameRenders(projectPath, subprojectPath, options.cleanup).catch(() => {});
    return metadata;
  } finally {
    if (activeFrameRender?.renderId === renderId) {
      activeFrameRender = null;
    }
    await removeNativeBundleDir(bundleDir).catch(() => {});
  }
}

function getFrameRender(renderId) {
  return frameRenders.get(renderId) ?? null;
}

function getActiveFrameRender() {
  return activeFrameRender;
}

module.exports = {
  renderFrame,
  getFrameRender,
  getActiveFrameRender,
  cleanupFrameRenders,
  ensureFrameRenderRuntimeSupport,
};
