/**
 * VS Code F5：若 5173 未就绪则后台启动 Vite，并等待可访问
 * 启动的进程 pid 写入临时文件，供 stop 调试时 cleanup-debug-processes 回收
 */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const waitOn = require("wait-on");
const { spawnDetachedHidden } = require("./process-utils.cjs");

const repoRoot = path.resolve(__dirname, "../../..");
const electronDir = path.join(repoRoot, "apps/electron");
const viteBin = path.join(electronDir, "node_modules/vite/bin/vite.js");
const VITE_PID_FILE = path.join(os.tmpdir(), "easymotion-debug-vite.pid");
const target = "http-get://127.0.0.1:5173";
const waitOpts = {
  interval: 500,
  validateStatus: (status) => status >= 200 && status < 500,
};

async function isViteUp(timeoutMs) {
  try {
    await waitOn({ resources: [target], timeout: timeoutMs, ...waitOpts });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (await isViteUp(3000)) {
    console.log("[ensure-vite] already running at", target);
    return;
  }

  console.log("[ensure-vite] starting vite …");
  const child = spawnDetachedHidden(process.execPath, [viteBin], {
    cwd: electronDir,
    env: process.env,
  });

  if (child.pid) {
    fs.writeFileSync(VITE_PID_FILE, String(child.pid), "utf8");
    console.log("[ensure-vite] recorded debug vite pid", child.pid);
  }

  await waitOn({ resources: [target], timeout: 120000, ...waitOpts });
  console.log("[ensure-vite] ready:", target);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[ensure-vite]", err.message);
    process.exit(1);
  });
