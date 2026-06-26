const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const DEFAULT_TIMEOUT_MS = 90_000;

function createShellCommand(command, args, cwd) {
  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/d", "/s", "/c", command, ...args], {
      cwd,
      env: { ...process.env },
      windowsHide: true,
    });
  }
  return spawn(command, args, {
    cwd,
    env: { ...process.env },
    shell: false,
  });
}

function runProcess(command, args, cwd, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = createShellCommand(command, args, cwd);
    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error(`E2412: Remotion 编译检查超时（${timeoutMs}ms）`));
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function resolveTscInvocation(remotionDir) {
  const localBin = path.join(
    remotionDir,
    "node_modules",
    "typescript",
    "bin",
    process.platform === "win32" ? "tsc.cmd" : "tsc"
  );
  if (fs.existsSync(localBin)) {
    return { command: localBin, args: ["--noEmit", "-p", "tsconfig.json"] };
  }
  return { command: "npx", args: ["tsc", "--noEmit", "-p", "tsconfig.json"] };
}

async function compileRemotionCheck(remotionDir, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (!fs.existsSync(remotionDir)) {
    return {
      success: false,
      skipped: true,
      reason: "missing-remotion-dir",
      errors: "remotion 目录不存在",
    };
  }

  const tsconfigPath = path.join(remotionDir, "tsconfig.json");
  if (!fs.existsSync(tsconfigPath)) {
    return {
      success: false,
      skipped: true,
      reason: "missing-tsconfig",
      errors: "未找到 tsconfig.json",
    };
  }

  const nodeModules = path.join(remotionDir, "node_modules");
  if (!fs.existsSync(nodeModules)) {
    return {
      success: false,
      skipped: true,
      reason: "missing-node-modules",
      errors: "remotion 项目尚未安装依赖（node_modules），请先打开预览或运行 npm install",
    };
  }

  const { command, args } = resolveTscInvocation(remotionDir);

  try {
    const result = await runProcess(command, args, remotionDir, timeoutMs);
    const output = `${result.stdout}\n${result.stderr}`.trim();
    if (result.code === 0) {
      return { success: true, skipped: false, errors: "" };
    }
    return {
      success: false,
      skipped: false,
      errors: output.slice(-4000) || `tsc exited with code ${result.code}`,
    };
  } catch (error) {
    return {
      success: false,
      skipped: false,
      errors: error.message || String(error),
    };
  }
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  compileRemotionCheck,
};
