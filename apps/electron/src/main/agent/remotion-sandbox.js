const fs = require("node:fs");
const path = require("node:path");
const { getRemotionDir } = require("../services/remotion-project");

const WRITABLE_PREFIXES = ["components/custom/", "presets/custom-registry.ts"];

const READABLE_BLOCKED = [
  /^node_modules\//,
  /^\.git\//,
];

const IMPORT_FROM_RE =
  /\bfrom\s+['"]([^'"]+)['"]/g;
const IMPORT_REQUIRE_RE =
  /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function resolveRemotionPaths(projectPath, subprojectPath = "subprojects/default") {
  if (!projectPath) {
    throw new Error("E2105: no open project");
  }
  const remotionDir = getRemotionDir(projectPath, subprojectPath);
  const srcDir = path.join(remotionDir, "src");
  return { remotionDir, srcDir };
}

function normalizeRelativePath(relativePath) {
  const raw = String(relativePath ?? "").trim().replace(/\\/g, "/");
  if (!raw) {
    throw new Error("E2410: 路径不能为空");
  }
  if (path.isAbsolute(raw)) {
    throw new Error("E2410: 不允许绝对路径");
  }

  const normalized = path.posix.normalize(raw).replace(/^(\.\/)+/, "");
  if (normalized.startsWith("../") || normalized === "..") {
    throw new Error("E2410: 路径越界");
  }
  return normalized;
}

function assertReadableRelativePath(relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  for (const pattern of READABLE_BLOCKED) {
    if (pattern.test(normalized)) {
      throw new Error(`E2410: 不允许读取 ${relativePath}`);
    }
  }
  return normalized;
}

function assertWritableRelativePath(relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  const allowed = WRITABLE_PREFIXES.some(
    (prefix) => normalized === prefix.replace(/\/$/, "") || normalized.startsWith(prefix)
  );
  if (!allowed) {
    throw new Error(`E2410: 不允许写入 ${relativePath}（仅 components/custom/** 与 presets/custom-registry.ts）`);
  }
  return normalized;
}

function resolveSrcFilePath(srcDir, relativePath) {
  const normalized = assertReadableRelativePath(relativePath);
  const absolute = path.join(srcDir, normalized);
  const relative = path.relative(srcDir, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("E2410: 路径越界");
  }
  return { normalized, absolute };
}

function loadPackageJson(remotionDir) {
  const packagePath = path.join(remotionDir, "package.json");
  if (!fs.existsSync(packagePath)) {
    return { dependencies: {}, devDependencies: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(packagePath, "utf8"));
  } catch {
    return { dependencies: {}, devDependencies: {} };
  }
}

function getAllowedImportPrefixes(remotionDir) {
  const pkg = loadPackageJson(remotionDir);
  const deps = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  };

  const allowed = new Set(["react", "react-dom", "remotion"]);
  for (const name of Object.keys(deps)) {
    allowed.add(name);
    if (name.startsWith("@remotion/")) {
      allowed.add(name);
    }
  }
  return allowed;
}

function extractImportSpecifiers(source) {
  const specs = new Set();
  const text = String(source ?? "");

  for (const re of [IMPORT_FROM_RE, IMPORT_REQUIRE_RE]) {
    re.lastIndex = 0;
    let match = re.exec(text);
    while (match) {
      specs.add(match[1]);
      match = re.exec(text);
    }
  }
  return [...specs];
}

function classifyImport(specifier) {
  if (specifier.startsWith(".") || specifier.startsWith("/")) {
    return { kind: "relative", specifier };
  }
  if (specifier.startsWith("node:")) {
    return { kind: "node", specifier };
  }
  const pkgName = specifier.startsWith("@")
    ? specifier.split("/").slice(0, 2).join("/")
    : specifier.split("/")[0];
  return { kind: "package", pkgName, specifier };
}

function assertImportsAllowed(content, remotionDir) {
  const allowed = getAllowedImportPrefixes(remotionDir);
  const violations = [];

  for (const spec of extractImportSpecifiers(content)) {
    const info = classifyImport(spec);
    if (info.kind === "relative") continue;
    if (info.kind === "node") {
      violations.push(spec);
      continue;
    }
    if (!allowed.has(info.pkgName)) {
      violations.push(info.pkgName);
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `E2411: 不允许的 import (${[...new Set(violations)].join(", ")})；仅可使用 remotion/package.json 中已安装的包或相对路径`
    );
  }
}

function listSrcFiles(srcDir, { maxDepth = 4 } = {}) {
  if (!fs.existsSync(srcDir)) {
    return [];
  }

  const results = [];

  function walk(currentDir, depth, prefix) {
    if (depth > maxDepth) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      const abs = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        results.push({ path: rel, type: "dir" });
        walk(abs, depth + 1, rel);
      } else if (entry.isFile()) {
        results.push({ path: rel, type: "file" });
      }
    }
  }

  walk(srcDir, 0, "");
  return results.sort((a, b) => a.path.localeCompare(b.path));
}

module.exports = {
  WRITABLE_PREFIXES,
  resolveRemotionPaths,
  normalizeRelativePath,
  assertReadableRelativePath,
  assertWritableRelativePath,
  resolveSrcFilePath,
  getAllowedImportPrefixes,
  extractImportSpecifiers,
  assertImportsAllowed,
  listSrcFiles,
};
