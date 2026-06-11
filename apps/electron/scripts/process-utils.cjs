/**
 * 调试 / 退出时清理子进程（Windows 需 /T 杀进程树）
 */
const { execSync, spawn, spawnSync } = require("node:child_process");

/** Windows CREATE_NO_WINDOW：后台 spawn 时不闪控制台 */
const WIN_SPAWN_HIDDEN =
  process.platform === "win32" ? { creationFlags: 0x08000000 } : {};

/** 后台静默启动子进程（F5 启动 Vite 等） */
function spawnDetachedHidden(command, args, options = {}) {
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    ...WIN_SPAWN_HIDDEN,
    ...options,
  });
  child.unref();
  return child;
}

/** 同步执行脚本且不弹出子控制台（preLaunch 步骤） */
function execFileHiddenSync(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    encoding: "utf8",
    ...WIN_SPAWN_HIDDEN,
    ...options,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const err = new Error(
      `${command} ${args.join(" ")} exited with code ${result.status}`,
    );
    err.status = result.status;
    throw err;
  }
  return result;
}

function findPidsOnPort(port) {
  if (process.platform !== "win32") {
    try {
      const out = execSync(`lsof -ti :${port}`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
        windowsHide: true,
      });
      return out
        .split(/\s+/)
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
    } catch {
      return [];
    }
  }

  let out = "";
  try {
    out = execSync(`netstat -ano | findstr ":${port}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
      windowsHide: true,
    });
  } catch {
    return [];
  }

  const pids = new Set();
  for (const line of out.split(/\r?\n/)) {
    if (!line.includes("LISTENING")) continue;
    const parts = line.trim().split(/\s+/);
    const pid = Number(parts[parts.length - 1]);
    if (Number.isInteger(pid) && pid > 0) pids.add(pid);
  }
  return [...pids];
}

function killPidTree(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;

  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${pid} /T /F`, {
        stdio: "ignore",
        windowsHide: true,
      });
    } else {
      try {
        process.kill(-pid, "SIGTERM");
      } catch {
        process.kill(pid, "SIGTERM");
      }
    }
    return true;
  } catch {
    return false;
  }
}

function killPortListeners(port) {
  const pids = findPidsOnPort(port);
  let killed = 0;
  for (const pid of pids) {
    if (killPidTree(pid)) killed += 1;
  }
  return killed;
}

module.exports = {
  findPidsOnPort,
  killPidTree,
  killPortListeners,
  spawnDetachedHidden,
  execFileHiddenSync,
};
