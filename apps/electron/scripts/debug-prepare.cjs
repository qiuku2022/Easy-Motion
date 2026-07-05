/**
 * F5 预检：确认 Electron 二进制 → （可选）释放 CDP → 等待/启动 Vite 5173
 * 不在启动前做全量 cleanup，避免每次 F5 误杀 5173 导致 ~4s 冷启动。
 */
const path = require("node:path");
const { execFileHiddenSync } = require("./process-utils.cjs");

const scriptDir = __dirname;
const node = process.execPath;

function run(name, extraEnv = {}) {
  execFileHiddenSync(node, [path.join(scriptDir, name)], {
    cwd: scriptDir,
    env: { ...process.env, ...extraEnv },
    timeout: 130000,
  });
}

run("ensure-electron-binary.cjs");

if (process.env.EASY_MOTION_PREPARE_FREE_CDP === "1") {
  run("free-cdp-port.cjs");
}

run("ensure-vite-for-debug.cjs");
console.log("[debug-prepare] done");
