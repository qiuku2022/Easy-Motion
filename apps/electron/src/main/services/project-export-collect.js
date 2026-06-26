const fs = require("node:fs");
const path = require("node:path");

const REMOTION_EXCLUDE_DIRS = new Set([
  "node_modules",
  ".easymotion",
  "dist",
  ".git",
  ".cache",
]);

function forEachTimelineClip(timeline, visit) {
  if (!timeline?.tracks?.length) return;

  for (const track of timeline.tracks) {
    if (track.type === "group") {
      for (const child of track.children ?? []) {
        for (const clip of child.clips ?? []) {
          visit(clip);
        }
      }
      continue;
    }
    for (const clip of track.clips ?? []) {
      visit(clip);
    }
  }
}

function normalizeRelativePath(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.replace(/\\/g, "/").replace(/^\/+/, "");
}

function addRelativePath(set, value) {
  const rel = normalizeRelativePath(value);
  if (rel && !rel.includes("..")) {
    set.add(rel);
  }
}

/**
 * Collect project-relative asset/data paths referenced by timeline clips.
 */
function collectReferencedProjectPaths(timeline, assetManifest) {
  const paths = new Set();
  const assets = Array.isArray(assetManifest?.assets)
    ? assetManifest.assets.filter((a) => !a.isDeleted)
    : [];
  const assetById = new Map(assets.map((a) => [a.id, a]));

  forEachTimelineClip(timeline, (clip) => {
    const source = clip.source;
    if (!source || typeof source !== "object") return;

    if (source.kind === "asset" && source.assetId) {
      const record = assetById.get(source.assetId);
      if (record?.path) {
        addRelativePath(paths, record.path);
      } else {
        addRelativePath(paths, source.path);
      }
      return;
    }

    addRelativePath(paths, source.path);
    addRelativePath(paths, source.dataPath);
    addRelativePath(paths, source.file);
    addRelativePath(paths, source.csvPath);
  });

  return [...paths];
}

function verifyProjectPaths(projectRoot, relativePaths) {
  const found = [];
  const missing = [];

  for (const rel of relativePaths) {
    const abs = path.join(projectRoot, rel);
    if (fs.existsSync(abs)) {
      found.push(rel);
    } else {
      missing.push(rel);
    }
  }

  return { found, missing };
}

function listFilesRecursive(dir, options = {}) {
  const excludeDirs = options.excludeDirs ?? REMOTION_EXCLUDE_DIRS;
  const files = [];

  if (!fs.existsSync(dir)) return files;

  const walk = (current, prefix) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (excludeDirs.has(entry.name)) continue;
        walk(path.join(current, entry.name), path.posix.join(prefix, entry.name));
        continue;
      }
      if (!entry.isFile()) continue;
      files.push({
        absolutePath: path.join(current, entry.name),
        archivePath: path.posix.join(prefix, entry.name),
      });
    }
  };

  walk(dir, "");
  return files;
}

function buildReadme(projectName) {
  const safeName = projectName?.trim() || "EasyMotion Project";
  return `# ${safeName} — Remotion 工程

由 EasyMotion 导出。

## 快速开始

\`\`\`bash
npm install
npm run start
\`\`\`

合成 ID: Main

## 说明

- \`src/\`：Remotion 源码与时间线 manifest
- \`public/\`：\`staticFile\` 可访问的静态资源
- \`assets/\`：项目素材副本（与 EasyMotion 工程内路径一致）
- \`data/\`：图表等引用的数据文件（若存在）
`;
}

module.exports = {
  REMOTION_EXCLUDE_DIRS,
  collectReferencedProjectPaths,
  verifyProjectPaths,
  listFilesRecursive,
  buildReadme,
  forEachTimelineClip,
};
