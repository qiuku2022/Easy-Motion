const fs = require("node:fs");
const path = require("node:path");

function getCompositorPackageId() {
  const libcSuffix =
    process.platform === "win32"
      ? "-msvc"
      : process.platform === "linux"
        ? "-gnu"
        : "";
  return `compositor-${process.platform}-${process.arch}${libcSuffix}`;
}

/**
 * Remotion native binaries (ffmpeg, remotion compositor) live in the subproject's
 * node_modules — pass explicitly so resolution stays correct in Electron.
 */
function resolveRemotionBinariesDirectory(remotionDir) {
  const pkgId = getCompositorPackageId();
  const direct = path.join(remotionDir, "node_modules", "@remotion", pkgId);
  if (fs.existsSync(direct)) {
    return direct;
  }

  try {
    const entry = require.resolve(`@remotion/${pkgId}`, { paths: [remotionDir] });
    const pkgRoot = path.dirname(entry);
    if (fs.existsSync(path.join(pkgRoot, "package.json"))) {
      return pkgRoot;
    }
  } catch {
    // fall through
  }

  return null;
}

function formatExportError(message) {
  const raw = String(message ?? "");
  if (raw.includes("spawn EFTYPE") || raw.includes("chrome-headless-shell")) {
    return "渲染引擎启动失败：请安装 Google Chrome，或设置环境变量 REMOTION_BROWSER_EXECUTABLE 指向 chrome.exe";
  }
  if (raw.includes("Chrome not found") || raw.includes("E2600: Chrome")) {
    return "未找到 Chrome 浏览器。请安装 Google Chrome 后重试。";
  }
  if (raw.includes("E2603")) {
    return "磁盘空间不足，无法完成导出。";
  }
  if (raw.includes("E2605")) {
    return "无法写入输出路径，请选择其他位置。";
  }
  if (raw.includes("E2602")) {
    return "导出已取消。";
  }
  if (raw.startsWith("E2600:")) {
    return raw.replace(/^E2600:\s*/, "");
  }
  return raw;
}

module.exports = {
  resolveRemotionBinariesDirectory,
  formatExportError,
};
