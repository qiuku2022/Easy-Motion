const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { assertTsxSecurity } = require("../generator/security-scan");
const {
  resolveRemotionPaths,
  resolveSrcFilePath,
  assertWritableRelativePath,
  assertImportsAllowed,
  listSrcFiles,
} = require("./remotion-sandbox");
const { compileRemotionCheck } = require("./remotion-compile-check");

class RemotionContext {
  constructor(meta = {}) {
    this.meta = meta;
    this.changed = false;
    this.changeLog = [];
    this.fileSnapshots = new Map();
    this.lastCompileResult = null;

    const { remotionDir, srcDir } = resolveRemotionPaths(
      meta.projectPath,
      meta.subprojectPath
    );
    this.remotionDir = remotionDir;
    this.srcDir = srcDir;
  }

  markChanged() {
    this.changed = true;
  }

  logChange(entry) {
    this.changeLog.push(entry);
  }

  snapshotFile(relativePath) {
    const { absolute, normalized } = resolveSrcFilePath(this.srcDir, relativePath);
    if (this.fileSnapshots.has(normalized)) return;
    const content = fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : null;
    this.fileSnapshots.set(normalized, content);
  }

  rollbackFile(relativePath) {
    const { absolute, normalized } = resolveSrcFilePath(this.srcDir, relativePath);
    if (!this.fileSnapshots.has(normalized)) return;
    const previous = this.fileSnapshots.get(normalized);
    if (previous === null) {
      if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
    } else {
      fs.mkdirSync(path.dirname(absolute), { recursive: true });
      fs.writeFileSync(absolute, previous, "utf8");
    }
    this.fileSnapshots.delete(normalized);
  }

  rollbackAll() {
    for (const relativePath of [...this.fileSnapshots.keys()]) {
      this.rollbackFile(relativePath);
    }
  }

  getSnapshotsForUndo() {
    const snapshots = [];
    for (const [relativePath, contentBefore] of this.fileSnapshots.entries()) {
      const { absolute, normalized } = resolveSrcFilePath(this.srcDir, relativePath);
      const existsAfter = fs.existsSync(absolute);
      const contentAfter = existsAfter ? fs.readFileSync(absolute, "utf8") : null;
      snapshots.push({
        relativePath: normalized,
        existedBefore: contentBefore !== null,
        contentBefore,
        existedAfter: existsAfter,
        hashAfter: hashContent(contentAfter),
      });
    }
    return snapshots;
  }

  validateWritableContent(content) {
    assertTsxSecurity(content);
    assertImportsAllowed(content, this.remotionDir);
  }

  listFiles({ maxDepth = 4 } = {}) {
    return listSrcFiles(this.srcDir, { maxDepth });
  }

  readFile(relativePath, { offset = 0, limit = 200 } = {}) {
    const { absolute, normalized } = resolveSrcFilePath(this.srcDir, relativePath);
    if (!fs.existsSync(absolute)) {
      throw new Error(`E2413: 文件不存在: ${normalized}`);
    }
    const content = fs.readFileSync(absolute, "utf8");
    const lines = content.split(/\r?\n/);
    const start = Math.max(0, Number(offset) || 0);
    const maxLines = Math.max(1, Math.min(Number(limit) || 200, 500));
    const slice = lines.slice(start, start + maxLines);
    return {
      path: normalized,
      offset: start,
      totalLines: lines.length,
      content: slice.join("\n"),
      truncated: start + maxLines < lines.length,
    };
  }

  writeFile(relativePath, content, { reason } = {}) {
    const normalized = assertWritableRelativePath(relativePath);
    this.validateWritableContent(content);

    const absolute = path.join(this.srcDir, normalized);
    const existedBefore = fs.existsSync(absolute);
    this.snapshotFile(normalized);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content, "utf8");

    this.markChanged();
    this.logChange({
      op: "writeRemotionFile",
      path: normalized,
      reason: reason ?? null,
      created: !existedBefore,
    });

    return { path: normalized, bytes: Buffer.byteLength(content, "utf8") };
  }

  patchFile(relativePath, search, replace) {
    const normalized = assertWritableRelativePath(relativePath);
    const { absolute } = resolveSrcFilePath(this.srcDir, normalized);
    if (!fs.existsSync(absolute)) {
      throw new Error(`E2413: 文件不存在: ${normalized}`);
    }

    const before = fs.readFileSync(absolute, "utf8");
    if (!this.fileSnapshots.has(normalized)) {
      this.fileSnapshots.set(normalized, before);
    } else if (this.fileSnapshots.get(normalized) === null) {
      this.fileSnapshots.set(normalized, before);
    }
    const occurrences = before.split(search).length - 1;
    if (occurrences === 0) {
      throw new Error(`E2414: patch 未找到匹配文本: ${normalized}`);
    }
    if (occurrences > 1) {
      throw new Error(`E2414: patch 匹配不唯一（${occurrences} 处）: ${normalized}`);
    }

    const after = before.replace(search, replace);
    this.validateWritableContent(after);

    fs.writeFileSync(absolute, after, "utf8");

    this.markChanged();
    this.logChange({
      op: "patchRemotionFile",
      path: normalized,
    });

    return { path: normalized, bytes: Buffer.byteLength(after, "utf8") };
  }

  deleteFile(relativePath, { reason } = {}) {
    const normalized = assertWritableRelativePath(relativePath);
    const { absolute } = resolveSrcFilePath(this.srcDir, normalized);
    if (!fs.existsSync(absolute)) {
      return { path: normalized, deleted: false };
    }

    this.snapshotFile(normalized);
    fs.unlinkSync(absolute);
    this.markChanged();
    this.logChange({
      op: "deleteRemotionFile",
      path: normalized,
      reason: reason ?? null,
    });
    return { path: normalized, deleted: true };
  }

  async runCompileCheck() {
    const result = await compileRemotionCheck(this.remotionDir);
    this.lastCompileResult = result;
    this.logChange({
      op: "compileRemotionCheck",
      success: result.success,
      skipped: Boolean(result.skipped),
    });
    return result;
  }
}

function hashContent(content) {
  if (content === null || content === undefined) return null;
  return crypto.createHash("sha256").update(String(content)).digest("hex");
}

function formatRemotionChangeSummary(changeLog) {
  if (!changeLog?.length) return "";

  const lines = changeLog
    .filter((entry) => entry.op !== "compileRemotionCheck")
    .map((entry) => {
      switch (entry.op) {
        case "writeRemotionFile":
          return entry.created
            ? `创建 Remotion 文件 ${entry.path}`
            : `更新 Remotion 文件 ${entry.path}`;
        case "patchRemotionFile":
          return `修改 Remotion 文件 ${entry.path}`;
        case "deleteRemotionFile":
          return `删除 Remotion 文件 ${entry.path}`;
        case "registerCustomComponent":
          return entry.appliedToTimeline
            ? `注册组件 ${entry.componentName} 并写入 ${entry.path}`
            : `注册组件 ${entry.componentName}`;
        case "unregisterCustomComponent":
          return `注销组件 ${entry.componentName}`;
        default:
          return entry.op;
      }
    });

  return lines.join("\n");
}

module.exports = {
  RemotionContext,
  formatRemotionChangeSummary,
  hashContent,
};
