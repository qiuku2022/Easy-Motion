/**
 * 释放 Electron remote-debugging-port，避免上次调试残留占用导致 attach 失败。
 */
const { execSync } = require("node:child_process");
const port = process.env.ELECTRON_CDP_PORT || "9333";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findPidsOnPort() {
  let out = "";
  try {
    out = execSync(`netstat -ano | findstr ":${port}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
      timeout: 8000,
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

function killPid(pid) {
  try {
    execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
    console.log(`[free-cdp-port] killed pid ${pid}`);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const pids = findPidsOnPort();
  if (pids.length === 0) {
    console.log(`[free-cdp-port] port ${port} is free`);
    return;
  }

  console.log(
    `[free-cdp-port] port ${port} in use (pid ${pids.join(", ")}), freeing…`
  );
  for (const pid of pids) killPid(pid);

  for (let i = 0; i < 20; i++) {
    if (findPidsOnPort().length === 0) {
      console.log(`[free-cdp-port] port ${port} released`);
      return;
    }
    await sleep(200);
  }

  throw new Error(`port ${port} still in use after cleanup`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[free-cdp-port]", err.message);
    process.exit(1);
  });
