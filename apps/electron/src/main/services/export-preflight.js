const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");

const VALID_FORMATS = new Set(["mp4", "webm", "gif"]);
const VALID_RESOLUTIONS = new Set(["original", "1080p", "720p", "480p"]);
const VALID_QUALITIES = new Set(["high", "medium", "low"]);

function validateExportRequest(request) {
  if (!request || typeof request !== "object") {
    throw new Error("E2604: invalid export request");
  }
  if (!request.projectPath || typeof request.projectPath !== "string") {
    throw new Error("E2105: no open project");
  }
  if (!request.outputPath || typeof request.outputPath !== "string") {
    throw new Error("E2605: output path required");
  }
  if (!VALID_FORMATS.has(request.format)) {
    throw new Error("E2604: unsupported export format");
  }
  if (!VALID_RESOLUTIONS.has(request.resolution)) {
    throw new Error("E2608: invalid export resolution");
  }
  if (!VALID_QUALITIES.has(request.quality)) {
    throw new Error("E2604: invalid export quality");
  }
}

function mapFormatToCodec(format) {
  if (format === "mp4") return "h264";
  if (format === "webm") return "vp8";
  if (format === "gif") return "gif";
  throw new Error("E2604: unsupported export format");
}

function mapQualityToCrf(quality) {
  switch (quality) {
    case "high":
      return 18;
    case "low":
      return 28;
    case "medium":
    default:
      return 23;
  }
}

function resolveScale(resolution, height) {
  if (resolution === "original") return 1;
  const targets = { "1080p": 1080, "720p": 720, "480p": 480 };
  const targetHeight = targets[resolution];
  if (!targetHeight || !height) {
    throw new Error("E2608: invalid export resolution");
  }
  return targetHeight / height;
}

function estimateRequiredBytes(timeline, resolution) {
  const width = Number(timeline?.width) || 1920;
  const height = Number(timeline?.height) || 1080;
  const frames = Number(timeline?.durationInFrames) || 125;
  let w = width;
  let h = height;
  if (resolution !== "original") {
    const scale = resolveScale(resolution, height);
    w = Math.round(width * scale);
    h = Math.round(height * scale);
  }
  const frameBytes = w * h * 3 * 0.12;
  return Math.ceil(frameBytes * frames + 500 * 1024 * 1024);
}

async function assertWritableOutput(outputPath) {
  const dir = path.dirname(outputPath);
  await fsp.mkdir(dir, { recursive: true });
  const probe = path.join(dir, `.em-write-probe-${process.pid}`);
  try {
    await fsp.writeFile(probe, "ok", "utf8");
    await fsp.unlink(probe);
  } catch {
    throw new Error("E2605: cannot write to output path");
  }
}

async function assertDiskSpace(outputPath, requiredBytes) {
  const dir = path.dirname(outputPath);
  try {
    const statfs = fsp.statfs ?? fs.statfs;
    if (typeof statfs !== "function") return;
    const stats = await statfs(dir);
    const freeBytes = Number(stats.bfree) * Number(stats.bsize);
    if (Number.isFinite(freeBytes) && freeBytes < requiredBytes) {
      throw new Error("E2603: insufficient disk space for export");
    }
  } catch (error) {
    if (error.message?.startsWith("E2603")) throw error;
  }
}

function assertMp4Header(outputPath) {
  const fd = fs.openSync(outputPath, "r");
  try {
    const buf = Buffer.alloc(12);
    fs.readSync(fd, buf, 0, 12, 0);
    const header = buf.toString("ascii", 4, 8);
    if (header !== "ftyp") {
      throw new Error("E2607: exported file appears corrupted");
    }
  } finally {
    fs.closeSync(fd);
  }
}

module.exports = {
  VALID_FORMATS,
  VALID_RESOLUTIONS,
  VALID_QUALITIES,
  validateExportRequest,
  mapFormatToCodec,
  mapQualityToCrf,
  resolveScale,
  estimateRequiredBytes,
  assertWritableOutput,
  assertDiskSpace,
  assertMp4Header,
};
