/**
 * VS Code postDebugTask 入口：后台启动 cleanup，本进程立即退出，避免
 * 「The task debug: cleanup is already active」弹窗。
 */
const path = require("node:path");
const { spawn } = require("node:child_process");

const script = path.join(__dirname, "cleanup-debug-processes.cjs");
const child = spawn(process.execPath, [script], {
  detached: true,
  stdio: "ignore",
  windowsHide: true,
  env: process.env,
});

child.unref();
console.log("[debug-cleanup] scheduled background cleanup");
