const fs = require("node:fs");
const { getConfigDir } = require("../utils/paths");
const { ensureDir, readJsonFile } = require("./file-service");

const UI_STATE_VERSION = "1.0";
const MAIN_WINDOW_MIN_WIDTH = 1200;
const MAIN_WINDOW_MIN_HEIGHT = 700;

const DEFAULT_UI_STATE = {
  version: UI_STATE_VERSION,
  window: {
    main: null,
  },
};

function getUiStatePath() {
  return `${getConfigDir()}/ui-state.json`;
}

function normalizeMainWindowState(raw) {
  if (!raw || typeof raw !== "object") return null;

  const x = Number(raw.x);
  const y = Number(raw.y);
  const width = Number(raw.width);
  const height = Number(raw.height);

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return null;
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    maximized: Boolean(raw.maximized),
    fullscreen: Boolean(raw.fullscreen),
  };
}

/** @param {{ x: number, y: number, width: number, height: number }} bounds */
function clampBoundsToWorkArea(bounds, workArea, minWidth, minHeight) {
  const width = Math.max(
    minWidth,
    Math.min(bounds.width, Math.max(minWidth, workArea.width)),
  );
  const height = Math.max(
    minHeight,
    Math.min(bounds.height, Math.max(minHeight, workArea.height)),
  );

  const maxX = workArea.x + workArea.width - width;
  const maxY = workArea.y + workArea.height - height;

  return {
    x: Math.round(Math.max(workArea.x, Math.min(bounds.x, maxX))),
    y: Math.round(Math.max(workArea.y, Math.min(bounds.y, maxY))),
    width: Math.round(width),
    height: Math.round(height),
  };
}

function loadUiStateFromDisk() {
  const filePath = getUiStatePath();
  ensureDir(getConfigDir());

  if (!fs.existsSync(filePath)) {
    return { ...DEFAULT_UI_STATE, window: { ...DEFAULT_UI_STATE.window } };
  }

  try {
    const raw = readJsonFile(filePath);
    return {
      version: UI_STATE_VERSION,
      window: {
        main: normalizeMainWindowState(raw?.window?.main),
      },
    };
  } catch {
    return { ...DEFAULT_UI_STATE, window: { ...DEFAULT_UI_STATE.window } };
  }
}

function getMainWindowState() {
  return loadUiStateFromDisk().window.main;
}

/**
 * @param {import("electron").BrowserWindow | null | undefined} win
 */
function captureMainWindowState(win) {
  if (!win || win.isDestroyed()) return null;

  const maximized = win.isMaximized();
  const fullscreen = win.isFullScreen();
  const bounds =
    maximized || fullscreen ? win.getNormalBounds() : win.getBounds();

  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    maximized,
    fullscreen,
  };
}

function resolveMainWindowPlacement(saved, fallbackBounds) {
  const { screen } = require("electron");
  const { workArea } = screen.getPrimaryDisplay();
  const base = saved
    ? clampBoundsToWorkArea(saved, workArea, MAIN_WINDOW_MIN_WIDTH, MAIN_WINDOW_MIN_HEIGHT)
    : clampBoundsToWorkArea(
        fallbackBounds,
        workArea,
        MAIN_WINDOW_MIN_WIDTH,
        MAIN_WINDOW_MIN_HEIGHT,
      );

  return {
    bounds: base,
    maximized: Boolean(saved?.maximized),
    fullscreen: Boolean(saved?.fullscreen),
  };
}

/**
 * 退出时同步写入，避免 close 后异步未完成。
 * @param {import("electron").BrowserWindow | null | undefined} win
 */
function saveMainWindowStateSync(win) {
  const main = captureMainWindowState(win);
  if (!main) return;

  const filePath = getUiStatePath();
  ensureDir(getConfigDir());

  const current = loadUiStateFromDisk();
  const next = {
    ...current,
    version: UI_STATE_VERSION,
    window: {
      ...current.window,
      main,
    },
  };

  fs.writeFileSync(filePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

module.exports = {
  MAIN_WINDOW_MIN_WIDTH,
  MAIN_WINDOW_MIN_HEIGHT,
  clampBoundsToWorkArea,
  captureMainWindowState,
  getMainWindowState,
  normalizeMainWindowState,
  resolveMainWindowPlacement,
  saveMainWindowStateSync,
};
