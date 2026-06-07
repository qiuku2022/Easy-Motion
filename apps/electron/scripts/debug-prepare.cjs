/**
 * F5 preLaunch：释放 CDP 端口 + 确保 Vite 5173 就绪（单任务，避免 VS Code 终端复用卡住）
 */
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const scriptDir = __dirname;
const node = process.execPath;

function runStep(name) {
  console.log(`[debug-prepare] → ${name}`);
  execFileSync(node, [path.join(scriptDir, name)], {
    cwd: scriptDir,
    stdio: "inherit",
    env: process.env,
    timeout: 130000,
  });
}

runStep("free-cdp-port.cjs");
runStep("ensure-vite-for-debug.cjs");
console.log("[debug-prepare] done");
