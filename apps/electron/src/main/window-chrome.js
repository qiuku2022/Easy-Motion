/**
 * 壳层窗口外观：固定深色，不跟随 Windows 浅色系统主题。
 *
 * TitleBar 顶盖对齐 renderer --card（oklch(0.205 0 0) ≈ #343434）。
 * 工作区对齐 --background（oklch(0.145 0 0) ≈ #252525）。
 *
 * macOS：hiddenInset + 系统红绿灯。
 * Windows/Linux：frameless + thickFrame，渲染层自绘 WindowControls。
 */
const SHELL_TITLEBAR_BG = "#343434";
const SHELL_WORKSPACE_BG = "#252525";

/** @deprecated 使用 SHELL_TITLEBAR_BG / SHELL_WORKSPACE_BG */
const SHELL_BACKGROUND = SHELL_WORKSPACE_BG;

/** @param {Electron.BrowserWindowConstructorOptions} bounds */
function getMainWindowChromeOptions(bounds) {
  const base = {
    ...bounds,
    title: "EasyMotion",
    backgroundColor: SHELL_TITLEBAR_BG,
    autoHideMenuBar: true,
    show: false,
  };

  if (process.platform === "darwin") {
    return {
      ...base,
      titleBarStyle: "hiddenInset",
    };
  }

  return {
    ...base,
    frame: false,
    thickFrame: true,
    roundedCorners: true,
  };
}

module.exports = {
  SHELL_BACKGROUND,
  SHELL_TITLEBAR_BG,
  SHELL_WORKSPACE_BG,
  getMainWindowChromeOptions,
};
