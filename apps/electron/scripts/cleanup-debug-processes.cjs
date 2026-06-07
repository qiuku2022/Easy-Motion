/**
 * F5 停止调试 / 关闭调试会话后清理残留子进程
 * - F5 启动的 Vite (5173)
 * - Remotion 预览 Vite (5174–5193)
 * - Electron CDP (9333)
 * - 可选：Python FastAPI (8001，Full Stack 调试)
 */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { killPidTree, killPortListeners } = require("./process-utils.cjs");

const VITE_PID_FILE = path.join(os.tmpdir(), "easymotion-debug-vite.pid");
const RENDERER_PORT = 5173;
const REMOTION_PORT_START = 5174;
const REMOTION_PORT_END = 5193;
const CDP_PORT = process.env.ELECTRON_CDP_PORT || "9333";
const PYTHON_PORT = process.env.EASY_MOTION_PYTHON_PORT || "8001";

function cleanupViteStartedByDebug() {
  if (!fs.existsSync(VITE_PID_FILE)) {
    console.log("[debug-cleanup] no debug vite pid file, skip renderer vite");
    return;
  }

  const raw = fs.readFileSync(VITE_PID_FILE, "utf8").trim();
  fs.unlinkSync(VITE_PID_FILE);

  const pid = Number(raw);
  if (!Number.isInteger(pid) || pid <= 0) return;

  console.log(`[debug-cleanup] stopping debug vite pid ${pid}`);
  const killed = killPidTree(pid);
  if (killed) return;

  const remaining = killPortListeners(RENDERER_PORT);
  if (remaining > 0) {
    console.log(
      `[debug-cleanup] freed renderer port ${RENDERER_PORT} (${remaining} pid)`,
    );
  }
}

function cleanupRemotionPreviewPorts() {
  let total = 0;
  for (let port = REMOTION_PORT_START; port <= REMOTION_PORT_END; port += 1) {
    total += killPortListeners(port);
  }
  if (total > 0) {
    console.log(`[debug-cleanup] freed remotion preview ports (${total} pid)`);
  }
}

function cleanupCdpPort() {
  const n = killPortListeners(Number(CDP_PORT));
  if (n > 0) {
    console.log(`[debug-cleanup] freed cdp port ${CDP_PORT} (${n} pid)`);
  }
}

function cleanupPythonIfRequested() {
  if (process.env.EASY_MOTION_CLEANUP_PYTHON !== "1") return;
  const n = killPortListeners(Number(PYTHON_PORT));
  if (n > 0) {
    console.log(`[debug-cleanup] freed python port ${PYTHON_PORT} (${n} pid)`);
  }
}

function main() {
  cleanupViteStartedByDebug();
  cleanupRemotionPreviewPorts();
  cleanupCdpPort();
  cleanupPythonIfRequested();
  console.log("[debug-cleanup] done");
}

main();
