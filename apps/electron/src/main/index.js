const { app, BrowserWindow, screen } = require("electron");
const path = require("node:path");
const { loadEnv } = require("./utils/load-env");
const { registerProjectHandlers } = require("./ipc-handlers/project");
const { registerTimelineHandlers } = require("./ipc-handlers/timeline");
const { registerPreviewHandlers } = require("./ipc-handlers/preview");
const { registerAssetHandlers } = require("./ipc-handlers/asset");
const { registerLlmHandlers } = require("./ipc-handlers/llm");
const previewService = require("./services/preview-service");
const { ensureDir } = require("./services/file-service");
const { getConfigDir } = require("./utils/paths");

loadEnv();

const RENDERER_DEV_URL = process.env.ELECTRON_RENDERER_URL || "http://127.0.0.1:5173";

function getInitialWindowBounds() {
  const { workArea } = screen.getPrimaryDisplay();
  const width = Math.round(workArea.width * 0.75);
  const height = Math.round(workArea.height * 0.75);
  return {
    width,
    height,
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2),
  };
}

const createWindow = () => {
  const win = new BrowserWindow({
    ...getInitialWindowBounds(),
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const useLegacy =
    process.env.EASY_MOTION_LEGACY_UI === "1" || process.argv.includes("--legacy-ui");

  if (useLegacy) {
    win.loadFile(path.join(__dirname, "../renderer/legacy/index.html"));
    return;
  }

  const isDev = !app.isPackaged;
  if (isDev) {
    win.loadURL(RENDERER_DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, "../../dist/renderer/index.html"));
  }
};

app.whenReady().then(() => {
  ensureDir(getConfigDir());
  registerProjectHandlers();
  registerTimelineHandlers();
  registerPreviewHandlers();
  registerAssetHandlers();
  registerLlmHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/** 退出时尽力停预览，不阻塞进程退出（F5 停止调试需立即结束） */
app.on("before-quit", () => {
  void previewService.stopPreview().catch((err) => {
    console.error("[app] preview cleanup failed:", err);
  });
});
