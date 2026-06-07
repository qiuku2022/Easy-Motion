/**
 * 调试 / 退出时清理子进程（Windows 需 /T 杀进程树）
 */
const { execSync } = require("node:child_process");

function findPidsOnPort(port) {
  if (process.platform !== "win32") {
    try {
      const out = execSync(`lsof -ti :${port}`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
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
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
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
};
