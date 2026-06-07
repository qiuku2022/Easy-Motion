const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn, execSync } = require("node:child_process");
const { BrowserWindow } = require("electron");
const timelineService = require("./timeline-service");
const { getTemplatesDir } = require("../utils/paths");

const PREVIEW_CHANNEL = "easymotion-preview";
const DEFAULT_PORT = 5174;
const PORT_RANGE = 20;

let previewProcess = null;
let previewState = {
  url: null,
  port: null,
  remotionDir: null,
  status: "idle",
};

function broadcastLog(line, phase = "preview") {
  const text = String(line).trimEnd();
  if (!text) return;
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send("renderer:preview:log", { line: text, phase });
    }
  }
}

function getRemotionDir(projectRoot, subprojectPath = "subprojects/default") {
  return path.join(projectRoot, subprojectPath, "remotion");
}

function createNpmProcess(args, cwd) {
  if (!fs.existsSync(cwd)) {
    throw new Error(`工作目录不存在: ${cwd}`);
  }

  const env = { ...process.env, BROWSER: "none" };

  // Windows 下直接 spawn npm.cmd 会触发 EINVAL，需经 cmd.exe 执行
  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/d", "/s", "/c", "npm", ...args], {
      cwd,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env,
    });
  }

  return spawn("npm", args, {
    cwd,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    env,
  });
}

function attachProcessLogs(child, label) {
  child.stdout?.on("data", (chunk) => broadcastLog(chunk.toString(), label));
  child.stderr?.on("data", (chunk) => broadcastLog(chunk.toString(), label));
}

function spawnLogged(label, args, cwd) {
  return new Promise((resolve, reject) => {
    broadcastLog(`[${label}] 开始: npm ${args.join(" ")}`, label);
    const child = createNpmProcess(args, cwd);
    attachProcessLogs(child, label);

    child.on("error", (err) => reject(err));
    child.on("exit", (code) => {
      if (code === 0) {
        broadcastLog(`[${label}] 完成`, label);
        resolve();
      } else {
        reject(new Error(`npm ${args.join(" ")} exited with code ${code}`));
      }
    });
  });
}

async function ensureRemotionDeps(remotionDir) {
  const nodeModules = path.join(remotionDir, "node_modules");
  if (fs.existsSync(nodeModules)) {
    broadcastLog("依赖已存在，跳过 npm install", "install");
    return;
  }

  previewState.status = "installing";
  broadcastLog("首次预览需要安装 Remotion 依赖，请稍候（约 1–5 分钟）...", "install");
  await spawnLogged(
    "install",
    ["install", "--no-fund", "--loglevel=info"],
    remotionDir
  );
}

function waitForHttp(url, timeoutMs = 120000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(true);
      });
      req.on("error", () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error("preview server start timeout"));
          return;
        }
        setTimeout(tick, 500);
      });
    };
    tick();
  });
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + PORT_RANGE; port += 1) {
    const ok = await new Promise((resolve) => {
      const server = http.createServer();
      server.once("error", () => resolve(false));
      server.listen(port, "127.0.0.1", () => {
        server.close(() => resolve(true));
      });
    });
    if (ok) return port;
  }
  throw new Error("no available preview port");
}

/** 将旧版 preview-entry（无效 onFrameUpdate）同步为模板最新版 */
function ensurePreviewEntry(remotionDir) {
  const destEntry = path.join(remotionDir, "src", "preview-entry.tsx");
  if (!fs.existsSync(destEntry)) return;

  const content = fs.readFileSync(destEntry, "utf8");
  if (!content.includes("onFrameUpdate")) return;

  const templateEntry = path.join(
    getTemplatesDir(),
    "default-project",
    "subprojects",
    "default",
    "remotion",
    "src",
    "preview-entry.tsx",
  );
  if (!fs.existsSync(templateEntry)) return;

  fs.copyFileSync(templateEntry, destEntry);
  broadcastLog("已更新 preview-entry（播放头同步修复）", "preview");
}

/** 同步预览独奏支持：preview-entry、preview-visibility、Newsletter MainSequence */
function ensurePreviewSoloSupport(remotionDir) {
  let updated = false;
  const templateSrc = path.join(
    getTemplatesDir(),
    "default-project",
    "subprojects",
    "default",
    "remotion",
    "src",
  );
  if (!fs.existsSync(templateSrc)) return updated;

  const destEntry = path.join(remotionDir, "src", "preview-entry.tsx");
  const templateEntry = path.join(templateSrc, "preview-entry.tsx");
  if (fs.existsSync(destEntry) && fs.existsSync(templateEntry)) {
    const content = fs.readFileSync(destEntry, "utf8");
    if (!content.includes("TIMELINE_UPDATE")) {
      fs.copyFileSync(templateEntry, destEntry);
      broadcastLog("已更新 preview-entry（独奏预览支持）", "preview");
      updated = true;
    }
  }

  const libDir = path.join(remotionDir, "src", "lib");
  const destLib = path.join(libDir, "preview-visibility.ts");
  const templateLib = path.join(templateSrc, "lib", "preview-visibility.ts");
  if (fs.existsSync(templateLib) && !fs.existsSync(destLib)) {
    fs.mkdirSync(libDir, { recursive: true });
    fs.copyFileSync(templateLib, destLib);
    broadcastLog("已添加 preview-visibility（独奏预览）", "preview");
    updated = true;
  }

  const mainSeq = path.join(remotionDir, "src", "components", "MainSequence.tsx");
  const templateMain = path.join(templateSrc, "components", "MainSequence.tsx");
  if (fs.existsSync(mainSeq) && fs.existsSync(templateMain)) {
    const content = fs.readFileSync(mainSeq, "utf8");
    const needsSoloVisibility =
      content.includes("NewsletterBackground") &&
      !content.includes("isClipVisibleInPreview");
    const needsPlayerPropsFix =
      content.includes("isClipVisibleInPreview") &&
      content.includes("getInputProps");
    if (needsSoloVisibility || needsPlayerPropsFix) {
      fs.copyFileSync(templateMain, mainSeq);
      broadcastLog(
        needsPlayerPropsFix
          ? "已修复 MainSequence（Player 预览 props）"
          : "已更新 MainSequence（独奏/可见性过滤）",
        "preview",
      );
      updated = true;
    }
  }

  return updated;
}

async function startPreview(projectRoot, subprojectPath = "subprojects/default") {
  await stopPreview();

  const remotionDir = getRemotionDir(projectRoot, subprojectPath);
  if (!fs.existsSync(remotionDir)) {
    throw new Error("E2201: remotion directory not found");
  }

  broadcastLog("正在准备 Remotion 预览环境…", "preview");
  ensurePreviewEntry(remotionDir);
  const soloSupportPatched = ensurePreviewSoloSupport(remotionDir);
  let remotionFingerprint = null;
  if (soloSupportPatched) {
    const refreshed = timelineService.refreshRemotionFingerprint(
      projectRoot,
      subprojectPath,
    );
    remotionFingerprint = refreshed?.fingerprint ?? null;
  }

  previewState.status = "installing";
  broadcastLog("正在检查 Remotion 依赖…", "install");
  await ensureRemotionDeps(remotionDir);

  broadcastLog("正在分配预览端口…", "preview");
  const port = await findAvailablePort(DEFAULT_PORT);
  const previewUrl = `http://127.0.0.1:${port}/preview.html`;

  previewState.status = "starting";
  broadcastLog(`启动 Vite 预览服务: ${previewUrl}`, "vite");
  broadcastLog("等待 Vite 编译完成（首次可能较慢）…", "vite");

  previewProcess = createNpmProcess(
    ["run", "preview:dev", "--", "--host", "127.0.0.1", "--port", String(port)],
    remotionDir
  );
  attachProcessLogs(previewProcess, "vite");
  previewProcess.on("error", (err) => {
    broadcastLog(`Vite 启动失败: ${err.message}`, "vite");
  });

  previewProcess.on("exit", () => {
    if (previewState.status !== "idle") {
      previewState.status = "stopped";
    }
    previewProcess = null;
  });

  await waitForHttp(previewUrl, 180000);

  previewState = {
    url: previewUrl,
    port,
    remotionDir,
    status: "running",
  };

  broadcastLog("预览服务已就绪", "vite");

  return {
    url: previewUrl,
    port,
    channel: PREVIEW_CHANNEL,
    remotionFingerprint,
  };
}

function killProcessTree(child) {
  if (!child?.pid) return;

  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: "ignore" });
    } else {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill("SIGTERM");
      }
    }
  } catch {
    try {
      child.kill("SIGKILL");
    } catch {
      /* already exited */
    }
  }
}

async function stopPreview() {
  if (previewProcess) {
    killProcessTree(previewProcess);
    previewProcess = null;
  }

  const { killPortListeners } = require("../../../scripts/process-utils.cjs");
  for (let port = DEFAULT_PORT; port < DEFAULT_PORT + PORT_RANGE; port += 1) {
    killPortListeners(port);
  }

  previewState = {
    url: null,
    port: null,
    remotionDir: null,
    status: "idle",
  };
}

function getPreviewState() {
  return { ...previewState, channel: PREVIEW_CHANNEL };
}

async function prepareAndStartPreview(
  projectRoot,
  subprojectPath = "subprojects/default"
) {
  broadcastLog("打开项目，自动启动 Remotion 预览…", "preview");
  const remotionSrc = timelineService.getRemotionSrcDir(projectRoot, subprojectPath);
  const rootTsx = path.join(remotionSrc, "Root.tsx");
  if (!fs.existsSync(rootTsx)) {
    broadcastLog("首次预览：根据时间线生成 Remotion 入口文件…", "preview");
    timelineService.generateForSubproject(projectRoot, subprojectPath);
  }
  return startPreview(projectRoot, subprojectPath);
}

module.exports = {
  PREVIEW_CHANNEL,
  getRemotionDir,
  startPreview,
  stopPreview,
  getPreviewState,
  prepareAndStartPreview,
  ensureRemotionDeps,
  ensurePreviewEntry,
  ensurePreviewSoloSupport,
};
