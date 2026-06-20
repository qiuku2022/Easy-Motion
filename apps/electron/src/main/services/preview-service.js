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
  const destFlatten = path.join(libDir, "flatten-clips-for-preview.ts");
  const templateFlatten = path.join(templateSrc, "lib", "flatten-clips-for-preview.ts");
  if (fs.existsSync(templateFlatten)) {
    const needsFlattenFile =
      !fs.existsSync(destFlatten) ||
      !fs.readFileSync(destFlatten, "utf8").includes("flattenClipsForPreview");
    if (needsFlattenFile) {
      fs.mkdirSync(libDir, { recursive: true });
      fs.copyFileSync(templateFlatten, destFlatten);
      broadcastLog("已添加 flatten-clips-for-preview（时间线驱动预览）", "preview");
      updated = true;
    }
  }

  const destBgOverride = path.join(libDir, "background-style-override.ts");
  const templateBgOverride = path.join(templateSrc, "lib", "background-style-override.ts");
  if (fs.existsSync(templateBgOverride)) {
    const needsBgOverride =
      !fs.existsSync(destBgOverride) ||
      !fs.readFileSync(destBgOverride, "utf8").includes("hasBackgroundStyleOverride");
    if (needsBgOverride) {
      fs.mkdirSync(libDir, { recursive: true });
      fs.copyFileSync(templateBgOverride, destBgOverride);
      broadcastLog("已添加 background-style-override（AI 背景色覆盖）", "preview");
      updated = true;
    }
  }

  const newsletterDir = path.join(remotionDir, "src", "components", "newsletter-design");
  for (const file of ["NewsletterBackground.tsx", "GradientBackground.tsx"]) {
    const dest = path.join(newsletterDir, file);
    const template = path.join(templateSrc, "components", "newsletter-design", file);
    if (!fs.existsSync(template)) continue;
    const needsPatch =
      !fs.existsSync(dest) ||
      !fs.readFileSync(dest, "utf8").includes("hasBackgroundStyleOverride");
    if (needsPatch) {
      fs.mkdirSync(newsletterDir, { recursive: true });
      fs.copyFileSync(template, dest);
      broadcastLog(`已更新 ${file}（支持时间线背景色覆盖）`, "preview");
      updated = true;
    }
  }

  const destLib = path.join(libDir, "preview-visibility.ts");
  const templateLib = path.join(templateSrc, "lib", "preview-visibility.ts");
  if (fs.existsSync(templateLib)) {
    const needsTimingHelper =
      !fs.existsSync(destLib) ||
      !fs.readFileSync(destLib, "utf8").includes("getClipTimingForPreview");
    if (needsTimingHelper) {
      fs.mkdirSync(libDir, { recursive: true });
      fs.copyFileSync(templateLib, destLib);
      broadcastLog("已更新 preview-visibility（片段时长预览）", "preview");
      updated = true;
    }
  }

  const componentsDir = path.join(remotionDir, "src", "components");
  const destClipSeq = path.join(componentsDir, "PreviewClipSequence.tsx");
  const templateClipSeq = path.join(templateSrc, "components", "PreviewClipSequence.tsx");
  if (fs.existsSync(templateClipSeq) && !fs.existsSync(destClipSeq)) {
    fs.mkdirSync(componentsDir, { recursive: true });
    fs.copyFileSync(templateClipSeq, destClipSeq);
    broadcastLog("已添加 PreviewClipSequence（片段时长预览）", "preview");
    updated = true;
  }

  const mainSeq = path.join(remotionDir, "src", "components", "MainSequence.tsx");
  const templateMain = path.join(templateSrc, "components", "MainSequence.tsx");
  if (fs.existsSync(mainSeq) && fs.existsSync(templateMain)) {
    const content = fs.readFileSync(mainSeq, "utf8");
    const needsTimelineDriven = !content.includes("flattenClipsForPreview");
    const needsSoloVisibility =
      content.includes("NewsletterBackground") &&
      !content.includes("isClipVisibleInPreview") &&
      !content.includes("flattenClipsForPreview");
    const needsPlayerPropsFix =
      content.includes("isClipVisibleInPreview") &&
      content.includes("getInputProps");
    const needsClipTiming =
      content.includes("isClipVisibleInPreview") &&
      !content.includes("PreviewClipSequence");
    const needsImageShapeLayers =
      content.includes("flattenClipsForPreview") &&
      !content.includes("ImageLayer");
    const needsBackgroundStyleOverride =
      content.includes("NewsletterBackground") &&
      !content.includes("style={clip.style}");
    if (
      needsTimelineDriven ||
      needsSoloVisibility ||
      needsPlayerPropsFix ||
      needsClipTiming ||
      needsImageShapeLayers ||
      needsBackgroundStyleOverride
    ) {
      fs.copyFileSync(templateMain, mainSeq);
      broadcastLog(
        needsTimelineDriven
          ? "已更新 MainSequence（时间线 JSON 驱动预览）"
          : needsBackgroundStyleOverride
            ? "已更新 MainSequence（背景色时间线覆盖）"
            : needsImageShapeLayers
              ? "已更新 MainSequence（image/shape 预览层）"
              : needsClipTiming
                ? "已更新 MainSequence（片段时长预览）"
                : needsPlayerPropsFix
                  ? "已修复 MainSequence（Player 预览 props）"
                  : "已更新 MainSequence（独奏/可见性过滤）",
        "preview",
      );
      updated = true;
    }
  }

  const destResolveMedia = path.join(libDir, "resolve-clip-media-src.ts");
  const templateResolveMedia = path.join(templateSrc, "lib", "resolve-clip-media-src.ts");
  if (fs.existsSync(templateResolveMedia) && !fs.existsSync(destResolveMedia)) {
    fs.mkdirSync(libDir, { recursive: true });
    fs.copyFileSync(templateResolveMedia, destResolveMedia);
    broadcastLog("已添加 resolve-clip-media-src（素材路径预览）", "preview");
    updated = true;
  }

  const destShape = path.join(remotionDir, "src", "components", "layers", "ShapeLayer.tsx");
  const templateShape = path.join(templateSrc, "components", "layers", "ShapeLayer.tsx");
  if (fs.existsSync(templateShape) && fs.existsSync(destShape)) {
    const shapeContent = fs.readFileSync(destShape, "utf8");
    if (!shapeContent.includes("style?.background")) {
      fs.copyFileSync(templateShape, destShape);
      broadcastLog("已更新 ShapeLayer（CSS 渐变背景）", "preview");
      updated = true;
    }
  }

  return updated;
}

const PREVIEW_CANVAS_BG = "#121212";
const LEGACY_PREVIEW_BG_PATTERN = /#0[fF]0[fF]23|#05050a/gi;

/** 将旧版紫调预览衬底同步为中性灰（preview.html / MainSequence / preview-entry） */
function ensurePreviewCanvasTheme(remotionDir) {
  let updated = false;

  const templateRemotion = path.join(
    getTemplatesDir(),
    "default-project",
    "subprojects",
    "default",
    "remotion",
  );

  const previewHtml = path.join(remotionDir, "preview.html");
  if (fs.existsSync(previewHtml)) {
    let content = fs.readFileSync(previewHtml, "utf8");
    const before = content;
    if (LEGACY_PREVIEW_BG_PATTERN.test(content)) {
      content = content.replace(LEGACY_PREVIEW_BG_PATTERN, PREVIEW_CANVAS_BG);
    }
    const hasNeutralCanvas =
      content.includes(PREVIEW_CANVAS_BG) || content.includes("oklch(0.085");
    if (!hasNeutralCanvas) {
      const templateHtml = path.join(templateRemotion, "preview.html");
      if (fs.existsSync(templateHtml)) {
        fs.copyFileSync(templateHtml, previewHtml);
        broadcastLog("已同步 preview.html（预览舞台背景）", "preview");
        updated = true;
      }
    } else if (content !== before) {
      fs.writeFileSync(previewHtml, content, "utf8");
      broadcastLog("已更新 preview.html（预览舞台背景）", "preview");
      updated = true;
    }
  }

  const mainSeq = path.join(remotionDir, "src", "components", "MainSequence.tsx");
  if (fs.existsSync(mainSeq)) {
    let content = fs.readFileSync(mainSeq, "utf8");
    const before = content;
    content = content.replace(
      /backgroundColor:\s*["']#0[fF]0[fF]23["']/g,
      `backgroundColor: "${PREVIEW_CANVAS_BG}"`,
    );
    if (content.includes("<AbsoluteFill>") && !content.includes("backgroundColor")) {
      content = content.replace(
        /<AbsoluteFill>/g,
        `<AbsoluteFill style={{ backgroundColor: "${PREVIEW_CANVAS_BG}" }}>`,
      );
    }
    if (content !== before) {
      fs.writeFileSync(mainSeq, content, "utf8");
      broadcastLog("已更新 MainSequence（预览舞台背景）", "preview");
      updated = true;
    }
  }

  const previewEntry = path.join(remotionDir, "src", "preview-entry.tsx");
  if (fs.existsSync(previewEntry)) {
    let content = fs.readFileSync(previewEntry, "utf8");
    const before = content;
    if (
      !content.includes(`backgroundColor: "${PREVIEW_CANVAS_BG}"`) &&
      !content.includes(`backgroundColor: '${PREVIEW_CANVAS_BG}'`)
    ) {
      content = content.replace(
        /style=\{\{\s*\n(\s*)width: "100%",/,
        `style={{\n$1backgroundColor: "${PREVIEW_CANVAS_BG}",\n$1width: "100%",`,
      );
    }
    if (content !== before) {
      fs.writeFileSync(previewEntry, content, "utf8");
      broadcastLog("已更新 preview-entry（预览舞台背景）", "preview");
      updated = true;
    }
  }

  return updated;
}

/** 同步预览循环播放开关（SET_LOOP 消息） */
function ensurePreviewLoopControl(remotionDir) {
  const destEntry = path.join(remotionDir, "src", "preview-entry.tsx");
  if (!fs.existsSync(destEntry)) return false;

  const content = fs.readFileSync(destEntry, "utf8");
  if (content.includes("SET_LOOP")) return false;

  const templateEntry = path.join(
    getTemplatesDir(),
    "default-project",
    "subprojects",
    "default",
    "remotion",
    "src",
    "preview-entry.tsx",
  );
  if (!fs.existsSync(templateEntry)) return false;

  fs.copyFileSync(templateEntry, destEntry);
  broadcastLog("已更新 preview-entry（循环播放开关）", "preview");
  return true;
}

/** 同步预览刷新后保持播放头位置（resumeFrameRef） */
function ensurePreviewPlayheadPreserve(remotionDir) {
  const destEntry = path.join(remotionDir, "src", "preview-entry.tsx");
  if (!fs.existsSync(destEntry)) return false;

  const content = fs.readFileSync(destEntry, "utf8");
  if (content.includes("canPostFramesRef")) return false;

  const templateEntry = path.join(
    getTemplatesDir(),
    "default-project",
    "subprojects",
    "default",
    "remotion",
    "src",
    "preview-entry.tsx",
  );
  if (!fs.existsSync(templateEntry)) return false;

  fs.copyFileSync(templateEntry, destEntry);
  broadcastLog("已更新 preview-entry（刷新后保持播放头）", "preview");
  return true;
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
  const canvasThemePatched = ensurePreviewCanvasTheme(remotionDir);
  const loopControlPatched = ensurePreviewLoopControl(remotionDir);
  const playheadPreservePatched = ensurePreviewPlayheadPreserve(remotionDir);
  let remotionFingerprint = null;
  if (
    soloSupportPatched ||
    canvasThemePatched ||
    loopControlPatched ||
    playheadPreservePatched
  ) {
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
  ensurePreviewPlayheadPreserve,
};
