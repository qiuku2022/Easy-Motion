const { ipcMain, BrowserWindow } = require("electron");

/** @param {Electron.IpcMainInvokeEvent} event */
function getSenderWindow(event) {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) {
    throw new Error("窗口不可用");
  }
  return win;
}

/** @param {import("electron").BrowserWindow} win */
function readWindowState(win) {
  return {
    maximized: win.isMaximized(),
    fullscreen: win.isFullScreen(),
  };
}

/** @param {import("electron").BrowserWindow} win */
function attachMainWindowStateEvents(win) {
  const notify = () => {
    if (win.isDestroyed()) return;
    win.webContents.send("renderer:window:stateChanged", readWindowState(win));
  };

  win.on("maximize", notify);
  win.on("unmaximize", notify);
  win.on("enter-full-screen", notify);
  win.on("leave-full-screen", notify);
}

function registerWindowHandlers() {
  ipcMain.handle("main:window:minimize", async (event) => {
    try {
      getSenderWindow(event).minimize();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { message: error.message || "unknown error" },
      };
    }
  });

  ipcMain.handle("main:window:toggleMaximize", async (event) => {
    try {
      const win = getSenderWindow(event);
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
      return { success: true, data: readWindowState(win) };
    } catch (error) {
      return {
        success: false,
        error: { message: error.message || "unknown error" },
      };
    }
  });

  ipcMain.handle("main:window:close", async (event) => {
    try {
      getSenderWindow(event).close();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { message: error.message || "unknown error" },
      };
    }
  });

  ipcMain.handle("main:window:getState", async (event) => {
    try {
      return { success: true, data: readWindowState(getSenderWindow(event)) };
    } catch (error) {
      return {
        success: false,
        error: { message: error.message || "unknown error" },
      };
    }
  });
}

module.exports = {
  registerWindowHandlers,
  attachMainWindowStateEvents,
  readWindowState,
};
