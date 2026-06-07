const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { copyFile, ensureDir, readJsonFile, atomicWriteJson } = require("./file-service");
const { getRemotionDir } = require("./remotion-project");

const ASSET_TYPES = ["image", "video", "audio"];

const EXTENSION_MAP = {
  png: "image",
  jpg: "image",
  jpeg: "image",
  webp: "image",
  gif: "image",
  svg: "image",
  mp4: "video",
  mov: "video",
  webm: "video",
  mp3: "audio",
  wav: "audio",
  aac: "audio",
  m4a: "audio",
};

function getManifestPath(projectRoot) {
  return path.join(projectRoot, "assets", "manifest.json");
}

function getRemotionPublicDir(projectRoot, subprojectRelativePath = "subprojects/default") {
  return path.join(getRemotionDir(projectRoot, subprojectRelativePath), "public");
}

function detectAssetType(filePath) {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return EXTENSION_MAP[ext] ?? null;
}

function loadManifest(projectRoot) {
  const manifestPath = getManifestPath(projectRoot);
  if (!fs.existsSync(manifestPath)) {
    return { version: 1, assets: [] };
  }
  try {
    const data = readJsonFile(manifestPath);
    return {
      version: data.version ?? 1,
      assets: Array.isArray(data.assets) ? data.assets : [],
    };
  } catch {
    return { version: 1, assets: [] };
  }
}

async function saveManifest(projectRoot, manifest) {
  const manifestPath = getManifestPath(projectRoot);
  ensureDir(path.dirname(manifestPath));
  await atomicWriteJson(manifestPath, manifest);
}

function tryLoadParseMedia(remotionDir) {
  try {
    const parserRoot = path.join(remotionDir, "node_modules", "@remotion", "media-parser");
    const { parseMedia } = require(parserRoot);
    const { nodeReader } = require(path.join(parserRoot, "node"));
    return { parseMedia, nodeReader };
  } catch {
    return null;
  }
}

async function extractMediaMetadata(absolutePath, assetType, fps, remotionDir) {
  if (assetType === "image") {
    return { durationInFrames: Math.max(1, Math.round(fps * 3)) };
  }

  const parser = tryLoadParseMedia(remotionDir);
  if (!parser) {
    return { durationInFrames: Math.max(1, Math.round(fps * 5)) };
  }

  try {
    const fields = {
      durationInSeconds: true,
      dimensions: assetType === "video",
    };
    const result = await parser.parseMedia({
      src: absolutePath,
      fields,
      reader: parser.nodeReader,
    });

    const durationInFrames = result.durationInSeconds
      ? Math.max(1, Math.round(result.durationInSeconds * fps))
      : Math.max(1, Math.round(fps * 5));

    const meta = { durationInFrames };
    if (result.dimensions) {
      meta.width = result.dimensions.width;
      meta.height = result.dimensions.height;
    }
    return meta;
  } catch {
    return { durationInFrames: Math.max(1, Math.round(fps * 5)) };
  }
}

function listAssets(projectRoot) {
  const manifest = loadManifest(projectRoot);
  return manifest.assets.filter((a) => !a.isDeleted);
}

async function importAssetFiles(
  projectRoot,
  filePaths,
  options = {},
) {
  const subprojectPath = options.subprojectPath ?? "subprojects/default";
  const fps = options.fps ?? 30;
  const remotionDir = getRemotionDir(projectRoot, subprojectPath);
  const publicRoot = getRemotionPublicDir(projectRoot, subprojectPath);
  const manifest = loadManifest(projectRoot);
  const imported = [];
  const errors = [];

  for (const sourcePath of filePaths) {
    if (!sourcePath || !fs.existsSync(sourcePath)) {
      errors.push({ path: sourcePath, message: "文件不存在" });
      continue;
    }

    const assetType = detectAssetType(sourcePath);
    if (!assetType) {
      errors.push({
        path: sourcePath,
        message: `不支持的文件格式：${path.extname(sourcePath)}`,
      });
      continue;
    }

    const id = crypto.randomUUID();
    const originalName = path.basename(sourcePath);
    const ext = path.extname(originalName);
    const storedName = `${id}${ext}`;
    const relativePath = path.posix.join("assets", assetType, storedName);
    const destPath = path.join(projectRoot, "assets", assetType, storedName);
    const publicDest = path.join(publicRoot, assetType, storedName);

    try {
      ensureDir(path.dirname(destPath));
      ensureDir(path.dirname(publicDest));
      await copyFile(sourcePath, destPath);
      await copyFile(sourcePath, publicDest);

      const meta = await extractMediaMetadata(destPath, assetType, fps, remotionDir);

      const record = {
        id,
        name: originalName,
        originalName,
        type: assetType,
        mimeType: guessMime(ext),
        path: relativePath.replace(/\\/g, "/"),
        publicPath: `/assets/${assetType}/${storedName}`,
        width: meta.width,
        height: meta.height,
        durationInFrames: meta.durationInFrames,
        importedAt: Date.now(),
        isDeleted: false,
      };

      manifest.assets.push(record);
      imported.push(record);
    } catch (err) {
      errors.push({
        path: sourcePath,
        message: err.message || "导入失败",
      });
    }
  }

  if (imported.length > 0) {
    await saveManifest(projectRoot, manifest);
  }

  return { imported, errors, assets: listAssets(projectRoot) };
}

function guessMime(ext) {
  const map = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".aac": "audio/aac",
    ".m4a": "audio/mp4",
  };
  return map[ext.toLowerCase()] ?? "application/octet-stream";
}

module.exports = {
  ASSET_TYPES,
  listAssets,
  importAssetFiles,
  detectAssetType,
};
