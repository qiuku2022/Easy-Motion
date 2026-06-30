/**
 * F5 preLaunch：释放 CDP 端口 + 确保 Vite 5173 就绪（单任务，避免 VS Code 终端复用卡住）
 */
const path = require("node:path");
const { execFileHiddenSync } = require("./process-utils.cjs");

const scriptDir = __dirname;
const node = process.execPath;

function runStep(name, extraEnv = {}) {
  console.log(`[debug-prepare] → ${name}`);
  execFileHiddenSync(node, [path.join(scriptDir, name)], {
    cwd: scriptDir,
    env: { ...process.env, ...extraEnv },
    timeout: 130000,
  });
}

runStep("cleanup-debug-processes.cjs", { EASY_MOTION_CLEANUP_FORCE: "1" });
runStep("ensure-electron-binary.cjs");
runStep("free-cdp-port.cjs");
runStep("ensure-vite-for-debug.cjs");
console.log("[debug-prepare] done");
