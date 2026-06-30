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
const { execSync } = require("node:child_process");
const { killPidTree, killPortListeners } = require("./process-utils.cjs");

const VITE_PID_FILE = path.join(os.tmpdir(), "easymotion-debug-vite.pid");
const CLEANUP_LOCK_FILE = path.join(os.tmpdir(), "easymotion-debug-cleanup.lock");
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

/** 终止 F5 中断后可能残留的 wait-cdp preLaunch 子进程 */
function cleanupWaitCdpScripts() {
  if (process.platform !== "win32") return;

  let out = "";
  try {
    out = execSync(
      'powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name = \'node.exe\'\\" | Where-Object { $_.CommandLine -like \'*wait-cdp.cjs*\' } | Select-Object -ExpandProperty ProcessId"',
      { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"], windowsHide: true },
    );
  } catch {
    return;
  }

  const pids = out
    .split(/\s+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);

  for (const pid of pids) {
    if (killPidTree(pid)) {
      console.log(`[debug-cleanup] stopped orphan wait-cdp pid ${pid}`);
    }
  }
}

function cleanupPythonIfRequested() {
  if (process.env.EASY_MOTION_CLEANUP_PYTHON !== "1") return;
  const n = killPortListeners(Number(PYTHON_PORT));
  if (n > 0) {
    console.log(`[debug-cleanup] freed python port ${PYTHON_PORT} (${n} pid)`);
  }
}

function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* allow chrome attach session to detach before killing CDP */
  }
}

function acquireCleanupLock() {
  try {
    if (fs.existsSync(CLEANUP_LOCK_FILE)) {
      const ageMs = Date.now() - fs.statSync(CLEANUP_LOCK_FILE).mtimeMs;
      if (ageMs < 15000) {
        console.log("[debug-cleanup] already running, skip");
        return false;
      }
      fs.unlinkSync(CLEANUP_LOCK_FILE);
    }
    fs.writeFileSync(CLEANUP_LOCK_FILE, String(process.pid));
    return true;
  } catch {
    return true;
  }
}

function releaseCleanupLock() {
  try {
    if (fs.existsSync(CLEANUP_LOCK_FILE)) {
      fs.unlinkSync(CLEANUP_LOCK_FILE);
    }
  } catch {
    /* ignore */
  }
}

function main() {
  const force = process.env.EASY_MOTION_CLEANUP_FORCE === "1";

  if (!force) {
    if (!acquireCleanupLock()) return;
    try {
      runCleanupBody();
    } finally {
      releaseCleanupLock();
    }
    return;
  }

  runCleanupBody();
}

function runCleanupBody() {
  sleepSync(300);
  cleanupWaitCdpScripts();
  cleanupViteStartedByDebug();
  cleanupRemotionPreviewPorts();
  cleanupCdpPort();
  cleanupPythonIfRequested();
  console.log("[debug-cleanup] done");
}

main();
