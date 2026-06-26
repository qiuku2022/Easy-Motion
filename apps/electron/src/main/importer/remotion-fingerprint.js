const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const WATCH_EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js"]);

/** Agent-written paths excluded from drift fingerprint */
const FINGERPRINT_SKIP_PREFIXES = ["components/custom/"];
const FINGERPRINT_SKIP_FILES = new Set(["presets/custom-registry.ts"]);

function shouldSkipFingerprintFile(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/");
  if (FINGERPRINT_SKIP_FILES.has(normalized)) return true;
  return FINGERPRINT_SKIP_PREFIXES.some(
    (prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix)
  );
}

function walkSourceFiles(dir, files = [], rootDir = dir) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "layers") continue;
      walkSourceFiles(fullPath, files, rootDir);
      continue;
    }
    const ext = path.extname(entry.name);
    if (!WATCH_EXTENSIONS.has(ext)) continue;
    const rel = path.relative(rootDir, fullPath).replace(/\\/g, "/");
    if (shouldSkipFingerprintFile(rel)) continue;
    files.push(fullPath);
  }
  return files;
}

function fingerprintRemotionSrc(remotionSrcDir) {
  const files = walkSourceFiles(remotionSrcDir).sort();
  const hash = crypto.createHash("sha256");

  for (const file of files) {
    const stat = fs.statSync(file);
    const rel = path.relative(remotionSrcDir, file).replace(/\\/g, "/");
    hash.update(`${rel}:${stat.mtimeMs}:${stat.size}\n`);
  }

  return {
    fingerprint: hash.digest("hex").slice(0, 16),
    fileCount: files.length,
  };
}

module.exports = {
  fingerprintRemotionSrc,
  walkSourceFiles,
  shouldSkipFingerprintFile,
};
