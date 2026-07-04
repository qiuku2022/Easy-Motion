const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_SUBPROJECT_PATH = "subprojects/default";
const AGENT_FRAMES_DIR = path.join(".easymotion", "agent-frames");
const DEFAULT_SEEK_TIMEOUT_MS = 5_000;
const DEFAULT_SETTLE_MS = 180;

const previewFrameBoundsByWebContents = new Map();
const pendingSeekRequests = new Map();
const previewCaptures = new Map();

function createPreviewCaptureId(now = Date.now()) {
  return `preview-${now}-${crypto.randomBytes(3).toString("hex")}`;
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
    throw new Error("E2600: invalid preview capture directory");
  }
  return { subprojectDir, framesDir };
}

function normalizeFrame(frame) {
  if (!Number.isInteger(frame) || frame < 0) {
    throw new Error("E2604: frame must be an integer >= 0");
  }
  return frame;
}

function normalizeRect(rect) {
  const normalized = {
    x: Math.round(Number(rect?.x)),
    y: Math.round(Number(rect?.y)),
    width: Math.round(Number(rect?.width)),
    height: Math.round(Number(rect?.height)),
  };
  if (
    !Number.isFinite(normalized.x) ||
    !Number.isFinite(normalized.y) ||
    !Number.isFinite(normalized.width) ||
    !Number.isFinite(normalized.height) ||
    normalized.width <= 0 ||
    normalized.height <= 0
  ) {
    throw new Error("E2604: invalid preview capture rect");
  }
  return normalized;
}

function getWebContentsId(webContents) {
  if (!webContents || webContents.isDestroyed?.()) {
    throw new Error("E2600: renderer preview is unavailable");
  }
  return webContents.id;
}

function registerPreviewFrameBounds(webContents, payload = {}) {
  const webContentsId = getWebContentsId(webContents);
  const rect = normalizeRect(payload.rect);
  previewFrameBoundsByWebContents.set(webContentsId, {
    rect,
    devicePixelRatio: Number(payload.devicePixelRatio) || 1,
    updatedAt: Date.now(),
  });
  return { rect };
}

function getPreviewFrameBounds(webContents) {
  const webContentsId = getWebContentsId(webContents);
  return previewFrameBoundsByWebContents.get(webContentsId) ?? null;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestPreviewSeek(webContents, input = {}, options = {}) {
  const frame = normalizeFrame(input.frame);
  const webContentsId = getWebContentsId(webContents);
  const requestId = options.requestId ?? `seek-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  const timeoutMs = options.timeoutMs ?? DEFAULT_SEEK_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingSeekRequests.delete(requestId);
      reject(new Error(`E2600: preview seek timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    pendingSeekRequests.set(requestId, {
      webContentsId,
      resolve: (payload) => {
        clearTimeout(timer);
        resolve({
          requestId,
          frame: payload?.frame ?? frame,
          completedAt: Date.now(),
        });
      },
      reject: (error) => {
        clearTimeout(timer);
        reject(error);
      },
    });

    webContents.send("renderer:preview:seek-requested", { requestId, frame });
  });
}

function resolvePreviewSeek(webContents, payload = {}) {
  const requestId = payload.requestId;
  if (!requestId || !pendingSeekRequests.has(requestId)) {
    return { resolved: false };
  }
  const pending = pendingSeekRequests.get(requestId);
  const webContentsId = getWebContentsId(webContents);
  if (pending.webContentsId !== webContentsId) {
    throw new Error("E2604: preview seek response came from a different renderer");
  }
  pendingSeekRequests.delete(requestId);
  pending.resolve(payload);
  return { resolved: true };
}

async function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function getImageSize(image, fallbackRect) {
  const size = image.getSize?.();
  return {
    width: Math.round(Number(size?.width) || fallbackRect.width),
    height: Math.round(Number(size?.height) || fallbackRect.height),
  };
}

async function capturePreview(request = {}, options = {}) {
  const webContents = request.webContents;
  const projectPath = request.projectPath;
  const subprojectPath = request.subprojectPath || DEFAULT_SUBPROJECT_PATH;
  if (!projectPath) {
    throw new Error("E2604: projectPath is required");
  }
  getWebContentsId(webContents);

  let frame = null;
  if (request.frame !== undefined && request.frame !== null) {
    frame = normalizeFrame(request.frame);
    await (options.requestPreviewSeek ?? requestPreviewSeek)(webContents, {
      frame,
    });
    await wait(options.settleMs ?? request.settleMs ?? DEFAULT_SETTLE_MS);
  }

  const bounds = request.rect
    ? { rect: normalizeRect(request.rect) }
    : getPreviewFrameBounds(webContents);
  if (!bounds?.rect) {
    throw new Error("E2600: preview capture area is not registered");
  }

  const captureId =
    options.captureId ?? createPreviewCaptureId(options.now?.() ?? Date.now());
  const { subprojectDir, framesDir } = assertAgentFramesDir(projectPath, subprojectPath);
  const imagePath = path.join(framesDir, `${captureId}.png`);
  const metadataPath = path.join(framesDir, `${captureId}.json`);
  await fs.mkdir(framesDir, { recursive: true });

  const image = await webContents.capturePage(bounds.rect);
  const png = image.toPNG();
  await fs.writeFile(imagePath, png);
  const size = getImageSize(image, bounds.rect);
  const metadata = {
    renderId: captureId,
    frame,
    subprojectPath,
    source: "preview",
    reason: request.reason ?? null,
    image: {
      relativePath: toPosixPath(path.relative(subprojectDir, imagePath)),
      absolutePath: imagePath,
      mime: "image/png",
      width: size.width,
      height: size.height,
      bytes: png.length,
      sha256: await sha256Buffer(png),
    },
    timelineSummary: request.timeline
      ? {
          fps: request.timeline.fps,
          durationInFrames: request.timeline.durationInFrames,
          width: request.timeline.width,
          height: request.timeline.height,
        }
      : undefined,
    createdAt: Date.now(),
  };
  await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  previewCaptures.set(captureId, metadata);
  return metadata;
}

function getFrameRender(renderId) {
  return previewCaptures.get(renderId) ?? null;
}

function createPreviewCaptureBridge(webContents, defaults = {}) {
  return {
    async seekPreview(input = {}, options = {}) {
      return requestPreviewSeek(webContents, input, options);
    },
    async capturePreview(input = {}, options = {}) {
      return capturePreview(
        {
          ...defaults,
          ...input,
          webContents,
        },
        options
      );
    },
    getFrameRender,
  };
}

module.exports = {
  registerPreviewFrameBounds,
  getPreviewFrameBounds,
  requestPreviewSeek,
  resolvePreviewSeek,
  capturePreview,
  getFrameRender,
  createPreviewCaptureBridge,
};
