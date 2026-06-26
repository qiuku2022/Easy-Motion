const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { ensureDir } = require("./file-service");

function getNativeImage() {
  try {
    return require("electron").nativeImage;
  } catch {
    return null;
  }
}

const THUMB_SIZE = 200;

function getThumbnailsDir(projectRoot) {
  return path.join(projectRoot, ".thumbnails");
}

function getThumbnailPath(projectRoot, assetId) {
  return path.join(getThumbnailsDir(projectRoot), `${assetId}.jpg`);
}

function getThumbnailRelativePath(assetId) {
  return path.posix.join(".thumbnails", `${assetId}.jpg`);
}

function writeJpegThumbnail(image, destPath) {
  const resized = image.resize({
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    quality: "good",
  });
  ensureDir(path.dirname(destPath));
  fs.writeFileSync(destPath, resized.toJPEG(82));
}

function tryFfmpegFrame(sourcePath, destPath) {
  try {
    ensureDir(path.dirname(destPath));
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        sourcePath,
        "-frames:v",
        "1",
        "-q:v",
        "3",
        destPath,
      ],
      { stdio: "ignore", timeout: 60_000 },
    );
    return fs.existsSync(destPath) && fs.statSync(destPath).size > 0;
  } catch {
    return false;
  }
}

/**
 * @returns {string | null} relative thumbnail path
 */
async function generateAssetThumbnail(projectRoot, assetId, sourcePath, assetType) {
  const destPath = getThumbnailPath(projectRoot, assetId);
  if (fs.existsSync(destPath)) {
    return getThumbnailRelativePath(assetId);
  }

  if (assetType === "image") {
    const nativeImage = getNativeImage();
    if (!nativeImage) return null;
    const img = nativeImage.createFromPath(sourcePath);
    if (!img.isEmpty()) {
      writeJpegThumbnail(img, destPath);
      return getThumbnailRelativePath(assetId);
    }
    return null;
  }

  if (assetType === "video") {
    if (tryFfmpegFrame(sourcePath, destPath)) {
      return getThumbnailRelativePath(assetId);
    }
    const nativeImage = getNativeImage();
    if (nativeImage) {
      const img = nativeImage.createFromPath(sourcePath);
      if (!img.isEmpty()) {
        writeJpegThumbnail(img, destPath);
        return getThumbnailRelativePath(assetId);
      }
    }
    return null;
  }

  if (assetType === "audio") {
    return null;
  }

  return null;
}

function readThumbnailAsDataUrl(projectRoot, thumbnailPath) {
  const nativeImage = getNativeImage();
  if (!nativeImage) return null;
  const absolute = path.isAbsolute(thumbnailPath)
    ? thumbnailPath
    : path.join(projectRoot, thumbnailPath);
  if (!fs.existsSync(absolute)) return null;
  const img = nativeImage.createFromPath(absolute);
  if (img.isEmpty()) return null;
  return img.toDataURL();
}

function readAssetPreviewAsDataUrl(projectRoot, asset) {
  if (asset.thumbnailPath) {
    const fromThumb = readThumbnailAsDataUrl(projectRoot, asset.thumbnailPath);
    if (fromThumb) return fromThumb;
  }

  const absolute = path.join(projectRoot, asset.path.replace(/\//g, path.sep));
  if (!fs.existsSync(absolute)) return null;

  if (asset.type === "image") {
    const nativeImage = getNativeImage();
    if (!nativeImage) return null;
    const img = nativeImage.createFromPath(absolute);
    if (img.isEmpty()) return null;
    const resized = img.resize({ width: 480, height: 480, quality: "good" });
    return resized.toDataURL();
  }

  return readThumbnailAsDataUrl(projectRoot, asset.thumbnailPath);
}

module.exports = {
  generateAssetThumbnail,
  getThumbnailRelativePath,
  readThumbnailAsDataUrl,
  readAssetPreviewAsDataUrl,
};
