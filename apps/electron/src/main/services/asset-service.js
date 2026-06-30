const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { copyFile, ensureDir, readJsonFile, atomicWriteJson } = require("./file-service");
const { getRemotionDir } = require("./remotion-project");
const thumbnailService = require("./thumbnail-service");

function getNativeImage() {
  try {
    return require("electron").nativeImage;
  } catch {
    return null;
  }
}

const ASSET_TYPES = ["image", "video", "audio"];
const DUPLICATE_ACTIONS = ["skip", "rename", "overwrite"];

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

const MAGIC_CHECKS = {
  png: (buf) => buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47,
  jpg: (buf) => buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  jpeg: (buf) => buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  gif: (buf) =>
    buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38,
  webp: (buf) =>
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50,
  mp4: (buf) => buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70,
  mov: (buf) => buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70,
  webm: (buf) =>
    buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3,
  mp3: (buf) =>
    (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) ||
    (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0),
  wav: (buf) =>
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46,
  aac: (buf) =>
    (buf[0] === 0xff && (buf[1] === 0xf1 || buf[1] === 0xf9)) ||
    (buf[0] === 0x41 && buf[1] === 0x44 && buf[2] === 0x49 && buf[3] === 0x46),
  m4a: (buf) => buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70,
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

function readFileHeader(filePath, length = 12) {
  const fd = fs.openSync(filePath, "r");
  try {
    const buf = Buffer.alloc(length);
    fs.readSync(fd, buf, 0, length, 0);
    return buf;
  } finally {
    fs.closeSync(fd);
  }
}

function validateFileMagic(filePath, assetType) {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  if (ext === "svg") {
    const text = fs.readFileSync(filePath, { encoding: "utf8", flag: "r" }).slice(0, 256);
    if (!/<svg[\s>]/i.test(text)) {
      return "文件内容与 SVG 格式不匹配";
    }
    return null;
  }

  const checker = MAGIC_CHECKS[ext];
  if (!checker) {
    return null;
  }

  try {
    const header = readFileHeader(filePath);
    if (!checker(header)) {
      return `文件内容与扩展名 .${ext} 不匹配`;
    }
  } catch {
    return "无法读取文件头";
  }

  if (!assetType || EXTENSION_MAP[ext] !== assetType) {
    return null;
  }

  return null;
}

async function computeContentHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
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

function activeAssets(manifest) {
  return manifest.assets.filter((a) => !a.isDeleted);
}

function findDuplicate(manifest, { originalName, contentHash }) {
  const assets = activeAssets(manifest);
  const byHash = assets.find((a) => a.contentHash && a.contentHash === contentHash);
  if (byHash) {
    return { existing: byHash, reason: "hash" };
  }
  const byName = assets.find(
    (a) => a.originalName === originalName || a.name === originalName,
  );
  if (byName) {
    return { existing: byName, reason: "name" };
  }
  return null;
}

function uniqueDisplayName(manifest, originalName) {
  const base = path.basename(originalName, path.extname(originalName));
  const ext = path.extname(originalName);
  const names = new Set(activeAssets(manifest).map((a) => a.originalName));
  let index = 1;
  let candidate = `${base} (${index})${ext}`;
  while (names.has(candidate)) {
    index += 1;
    candidate = `${base} (${index})${ext}`;
  }
  return candidate;
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
    const nativeImage = getNativeImage();
    const size =
      nativeImage && !nativeImage.createFromPath(absolutePath).isEmpty()
        ? nativeImage.createFromPath(absolutePath).getSize()
        : null;
    return {
      durationInFrames: Math.max(1, Math.round(fps * 3)),
      width: size?.width,
      height: size?.height,
    };
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
  return activeAssets(manifest);
}

function getAssetById(projectRoot, assetId) {
  const manifest = loadManifest(projectRoot);
  return manifest.assets.find((a) => a.id === assetId && !a.isDeleted) ?? null;
}

async function scanImportDuplicates(projectRoot, filePaths) {
  const manifest = loadManifest(projectRoot);
  const duplicates = [];

  for (const sourcePath of filePaths) {
    if (!sourcePath || !fs.existsSync(sourcePath)) continue;

    const originalName = path.basename(sourcePath);
    const contentHash = await computeContentHash(sourcePath);
    const duplicate = findDuplicate(manifest, { originalName, contentHash });
    if (duplicate) {
      duplicates.push({
        sourcePath,
        originalName,
        contentHash,
        reason: duplicate.reason,
        existingId: duplicate.existing.id,
        existingName: duplicate.existing.originalName ?? duplicate.existing.name,
      });
    }
  }

  return duplicates;
}

async function importSingleAsset(
  projectRoot,
  sourcePath,
  manifest,
  context,
) {
  const { fps, remotionDir, publicRoot, duplicateAction, existingId } = context;

  const assetType = detectAssetType(sourcePath);
  if (!assetType) {
    throw new Error(`不支持的文件格式：${path.extname(sourcePath)}`);
  }

  const magicError = validateFileMagic(sourcePath, assetType);
  if (magicError) {
    throw new Error(magicError);
  }

  const contentHash = await computeContentHash(sourcePath);
  const originalName = path.basename(sourcePath);
  const duplicate = findDuplicate(manifest, { originalName, contentHash });

  if (duplicate && duplicateAction === "skip") {
    return { skipped: true, existing: duplicate.existing };
  }

  const ext = path.extname(originalName);
  const sizeBytes = fs.statSync(sourcePath).size;

  if (duplicate && duplicateAction === "overwrite") {
    const existing = manifest.assets.find((a) => a.id === (existingId ?? duplicate.existing.id));
    if (!existing || existing.isDeleted) {
      throw new Error("要覆盖的素材不存在");
    }

    const destPath = path.join(projectRoot, existing.path.replace(/\//g, path.sep));
    const publicName = path.basename(existing.publicPath ?? "");
    const publicDest = path.join(publicRoot, assetType, publicName);

    await copyFile(sourcePath, destPath);
    await copyFile(sourcePath, publicDest);

    const meta = await extractMediaMetadata(destPath, assetType, fps, remotionDir);
    const thumbnailPath = await thumbnailService.generateAssetThumbnail(
      projectRoot,
      existing.id,
      destPath,
      assetType,
    );

    Object.assign(existing, {
      type: assetType,
      mimeType: guessMime(ext),
      contentHash,
      sizeBytes,
      width: meta.width,
      height: meta.height,
      durationInFrames: meta.durationInFrames,
      thumbnailPath: thumbnailPath ?? existing.thumbnailPath,
      importedAt: Date.now(),
    });

    return { record: existing, skipped: false };
  }

  const id = crypto.randomUUID();
  const displayName =
    duplicate && duplicateAction === "rename"
      ? uniqueDisplayName(manifest, originalName)
      : originalName;
  const storedName = `${id}${ext}`;
  const relativePath = path.posix.join("assets", assetType, storedName);
  const destPath = path.join(projectRoot, "assets", assetType, storedName);
  const publicDest = path.join(publicRoot, assetType, storedName);

  ensureDir(path.dirname(destPath));
  ensureDir(path.dirname(publicDest));
  await copyFile(sourcePath, destPath);
  await copyFile(sourcePath, publicDest);

  const meta = await extractMediaMetadata(destPath, assetType, fps, remotionDir);
  const thumbnailPath = await thumbnailService.generateAssetThumbnail(
    projectRoot,
    id,
    destPath,
    assetType,
  );

  const record = {
    id,
    name: displayName,
    originalName: displayName,
    type: assetType,
    mimeType: guessMime(ext),
    path: relativePath.replace(/\\/g, "/"),
    publicPath: `/assets/${assetType}/${storedName}`,
    contentHash,
    sizeBytes,
    width: meta.width,
    height: meta.height,
    durationInFrames: meta.durationInFrames,
    thumbnailPath: thumbnailPath ?? undefined,
    isFavorite: false,
    usageCount: 0,
    lastUsedAt: undefined,
    importedAt: Date.now(),
    isDeleted: false,
  };

  manifest.assets.push(record);
  return { record, skipped: false };
}

async function importAssetFiles(projectRoot, filePaths, options = {}) {
  const subprojectPath = options.subprojectPath ?? "subprojects/default";
  const fps = options.fps ?? 30;
  const remotionDir = getRemotionDir(projectRoot, subprojectPath);
  const publicRoot = getRemotionPublicDir(projectRoot, subprojectPath);
  const manifest = loadManifest(projectRoot);
  const imported = [];
  const errors = [];
  const skipped = [];
  const duplicateResolutions = options.duplicateResolutions ?? {};

  const hasResolutions = Object.keys(duplicateResolutions).length > 0;
  if (!hasResolutions) {
    const duplicates = await scanImportDuplicates(projectRoot, filePaths);
    if (duplicates.length > 0) {
      return {
        imported: [],
        errors: [],
        skipped: [],
        assets: listAssets(projectRoot),
        duplicates,
        pendingFilePaths: filePaths,
        needsDuplicateResolution: true,
      };
    }
  }

  for (const sourcePath of filePaths) {
    if (!sourcePath || !fs.existsSync(sourcePath)) {
      errors.push({ path: sourcePath, message: "文件不存在" });
      continue;
    }

    const resolution = duplicateResolutions[sourcePath];
    const duplicateAction =
      resolution && DUPLICATE_ACTIONS.includes(resolution.action)
        ? resolution.action
        : "rename";

    try {
      const result = await importSingleAsset(projectRoot, sourcePath, manifest, {
        subprojectPath,
        fps,
        remotionDir,
        publicRoot,
        duplicateAction,
        existingId: resolution?.existingId,
      });

      if (result.skipped) {
        skipped.push({ path: sourcePath, existingId: result.existing?.id });
        continue;
      }

      imported.push(result.record);
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

  return {
    imported,
    errors,
    skipped,
    assets: listAssets(projectRoot),
    duplicates: [],
    needsDuplicateResolution: false,
  };
}

function guessExtFromUrl(urlString) {
  try {
    const pathname = new URL(urlString).pathname;
    const ext = path.extname(pathname);
    return ext || null;
  } catch {
    return null;
  }
}

function guessExtFromContentType(contentType) {
  const type = String(contentType ?? "").split(";")[0].trim().toLowerCase();
  const map = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/aac": ".aac",
    "audio/mp4": ".m4a",
  };
  return map[type] ?? null;
}

async function downloadUrlToTemp(urlString) {
  const response = await fetch(urlString);
  if (!response.ok) {
    throw new Error(`下载素材失败: HTTP ${response.status}`);
  }

  const ext =
    guessExtFromUrl(urlString) ||
    guessExtFromContentType(response.headers.get("content-type")) ||
    ".bin";
  const tempDir = path.join(os.tmpdir(), "easymotion-import");
  ensureDir(tempDir);
  const tempPath = path.join(tempDir, `${crypto.randomUUID()}${ext}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(tempPath, buffer);
  return tempPath;
}

async function resolveImportSourcePath(projectRoot, source) {
  const trimmed = String(source ?? "").trim();
  if (!trimmed) {
    throw new Error("素材来源不能为空");
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return downloadUrlToTemp(trimmed);
  }

  if (fs.existsSync(trimmed)) {
    return trimmed;
  }

  const projectRelative = path.join(projectRoot, trimmed);
  if (fs.existsSync(projectRelative)) {
    return projectRelative;
  }

  throw new Error(`无法解析素材来源: ${trimmed}`);
}

async function importAssetSource(
  projectRoot,
  { source, type, name },
  options = {},
) {
  const filePath = await resolveImportSourcePath(projectRoot, source);
  const detectedType = detectAssetType(filePath);
  const assetType = type ?? detectedType;

  if (!assetType || !ASSET_TYPES.includes(assetType)) {
    throw new Error("不支持的素材类型");
  }
  if (detectedType && type && detectedType !== type) {
    throw new Error(`素材类型不匹配：文件为 ${detectedType}，指定为 ${type}`);
  }

  const { imported, errors } = await importAssetFiles(projectRoot, [filePath], options);
  if (!imported.length) {
    throw new Error(errors[0]?.message ?? "素材导入失败");
  }

  const asset = { ...imported[0] };
  if (name) {
    asset.name = name;
    const manifest = loadManifest(projectRoot);
    const index = manifest.assets.findIndex((item) => item.id === asset.id);
    if (index >= 0) {
      manifest.assets[index].name = name;
      await saveManifest(projectRoot, manifest);
    }
  }

  return asset;
}

async function updateAssetMeta(projectRoot, assetId, patch) {
  const manifest = loadManifest(projectRoot);
  const index = manifest.assets.findIndex((a) => a.id === assetId && !a.isDeleted);
  if (index < 0) {
    throw new Error("素材不存在");
  }

  const current = manifest.assets[index];
  if (typeof patch.isFavorite === "boolean") {
    current.isFavorite = patch.isFavorite;
  }
  if (typeof patch.name === "string" && patch.name.trim()) {
    current.name = patch.name.trim();
  }

  await saveManifest(projectRoot, manifest);
  return current;
}

async function recordAssetUsage(projectRoot, assetId) {
  const manifest = loadManifest(projectRoot);
  const index = manifest.assets.findIndex((a) => a.id === assetId && !a.isDeleted);
  if (index < 0) {
    throw new Error("素材不存在");
  }

  const current = manifest.assets[index];
  current.usageCount = (current.usageCount ?? 0) + 1;
  current.lastUsedAt = Date.now();
  await saveManifest(projectRoot, manifest);
  return current;
}

function readAssetThumbnail(projectRoot, assetId) {
  const asset = getAssetById(projectRoot, assetId);
  if (!asset) {
    throw new Error("素材不存在");
  }
  const dataUrl = thumbnailService.readAssetPreviewAsDataUrl(projectRoot, asset);
  if (!dataUrl) {
    throw new Error("无法生成缩略图");
  }
  return { dataUrl };
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
  DUPLICATE_ACTIONS,
  loadManifest,
  listAssets,
  getAssetById,
  importAssetFiles,
  importAssetSource,
  detectAssetType,
  scanImportDuplicates,
  updateAssetMeta,
  recordAssetUsage,
  readAssetThumbnail,
};
