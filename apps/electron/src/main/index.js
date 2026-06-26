const { app, BrowserWindow, nativeTheme, screen } = require("electron");
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
const {
  registerWindowHandlers,
  attachMainWindowStateEvents,
} = require("./ipc-handlers/window");
const previewService = require("./services/preview-service");
const uiStateService = require("./services/ui-state-service");
const { installApplicationMenu } = require("./application-menu");
const { getMainWindowChromeOptions } = require("./window-chrome");
const { ensureDir } = require("./services/file-service");
const { getConfigDir } = require("./utils/paths");

loadEnv();

// 固定暗色壳层，避免 Windows 浅色主题把标题栏刷成白色
nativeTheme.themeSource = "dark";

const RENDERER_DEV_URL = process.env.ELECTRON_RENDERER_URL || "http://127.0.0.1:5173";

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
  registerWindowHandlers();
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
});
