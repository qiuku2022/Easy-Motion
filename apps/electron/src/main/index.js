const { app, BrowserWindow, nativeTheme, screen } = require("electron");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { loadEnv } = require("./utils/load-env");
const { registerProjectHandlers } = require("./ipc-handlers/project");
const { registerTimelineHandlers } = require("./ipc-handlers/timeline");
const { registerPreviewHandlers } = require("./ipc-handlers/preview");
const { registerAssetHandlers } = require("./ipc-handlers/asset");
const { registerDataHandlers } = require("./ipc-handlers/data");
const { registerLlmHandlers } = require("./ipc-handlers/llm");
const { registerSettingsHandlers } = require("./ipc-handlers/settings");
const { registerConversationHandlers } = require("./ipc-handlers/conversation");
const { registerExportHandlers } = require("./ipc-handlers/export");
const { registerWorkspaceHandlers } = require("./ipc-handlers/workspace");
const {
  registerWindowHandlers,
  attachMainWindowStateEvents,
} = require("./ipc-handlers/window");
const previewService = require("./services/preview-service");
const pythonService = require("./services/python-service");
const uiStateService = require("./services/ui-state-service");
const { installApplicationMenu } = require("./application-menu");
const { getMainWindowChromeOptions } = require("./window-chrome");
const { ensureDir } = require("./services/file-service");
const { getConfigDir } = require("./utils/paths");
const { spawnDetachedHidden } = require("./utils/process-utils");

loadEnv();

// 固定暗色壳层，避免 Windows 浅色主题把标题栏刷成白色
nativeTheme.themeSource = "dark";

const RENDERER_DEV_URL = process.env.ELECTRON_RENDERER_URL || "http://127.0.0.1:5173";
const DEBUG_VITE_PID_FILE = path.join(os.tmpdir(), "easymotion-debug-vite.pid");

/** @type {import("electron").BrowserWindow | null} */
let mainWindow = null;

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
  const saved = uiStateService.getMainWindowState();
  const { bounds, maximized, fullscreen } = uiStateService.resolveMainWindowPlacement(
    saved,
    getInitialWindowBounds(),
  );

  const win = new BrowserWindow({
    ...getMainWindowChromeOptions(bounds),
    minWidth: uiStateService.MAIN_WINDOW_MIN_WIDTH,
    minHeight: uiStateService.MAIN_WINDOW_MIN_HEIGHT,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow = win;
  attachMainWindowStateEvents(win);

  if (fullscreen) {
    win.setFullScreen(true);
  } else if (maximized) {
    win.maximize();
  }

  win.once("ready-to-show", () => {
    win.show();
  });

  win.on("close", () => {
    uiStateService.saveMainWindowStateSync(win);
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    win.webContents.once("did-finish-load", () => {
      if (process.env.ELECTRON_CDP_PORT) {
        console.log("[easymotion] renderer cdp ready");
      }
    });
    win.loadURL(RENDERER_DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, "../../dist/renderer/index.html"));
  }
};

async function isRendererDevServerUp(timeoutMs) {
  const waitOn = require("wait-on");
  try {
    await waitOn({
      resources: [RENDERER_DEV_URL.replace(/^http:\/\//, "http-get://")],
      timeout: timeoutMs,
      interval: 500,
      validateStatus: (status) => status >= 200 && status < 500,
    });
    return true;
  } catch {
    return false;
  }
}

async function ensureRendererDevServer() {
  if (app.isPackaged || process.env.EASY_MOTION_SKIP_DEV_RENDERER_PREPARE === "1") {
    return;
  }

  if (await isRendererDevServerUp(1000)) {
    return;
  }

  const electronDir = path.resolve(__dirname, "../..");
  const viteBin = path.join(electronDir, "node_modules/vite/bin/vite.js");
  console.log("[easymotion] starting renderer dev server");

  const child = spawnDetachedHidden("node", [viteBin], {
    cwd: electronDir,
    env: process.env,
  });
  if (child.pid) {
    fs.writeFileSync(DEBUG_VITE_PID_FILE, String(child.pid), "utf8");
  }

  const waitOn = require("wait-on");
  await waitOn({
    resources: [RENDERER_DEV_URL.replace(/^http:\/\//, "http-get://")],
    timeout: 120000,
    interval: 500,
    validateStatus: (status) => status >= 200 && status < 500,
  });
  console.log("[easymotion] renderer dev server ready");
}

app.whenReady().then(async () => {
  installApplicationMenu();
  ensureDir(getConfigDir());
  registerProjectHandlers();
  registerTimelineHandlers();
  registerPreviewHandlers();
  registerAssetHandlers();
  registerDataHandlers();
  registerLlmHandlers();
  registerSettingsHandlers();
  registerConversationHandlers();
  registerExportHandlers();
  registerWorkspaceHandlers();
  registerWindowHandlers();

  if (app.isPackaged) {
    try {
      await pythonService.startBundledPython();
    } catch (err) {
      console.error("[app] bundled python failed to start:", err);
    }
  }

  await ensureRendererDevServer();
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
  if (mainWindow && !mainWindow.isDestroyed()) {
    uiStateService.saveMainWindowStateSync(mainWindow);
  }

  void previewService.stopPreview().catch((err) => {
    console.error("[app] preview cleanup failed:", err);
  });

  pythonService.stopBundledPython();
});
