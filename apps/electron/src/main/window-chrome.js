/**
 * 壳层窗口外观：固定深色，不跟随 Windows 浅色系统主题。
 * 背景色对齐 renderer index.css --background（oklch(0.145 0 0) ≈ #252525）。
 *
 * Windows：保留系统原生标题栏 + nativeTheme.dark，由 Win11 统一绘制深色 caption 按钮。
 * （titleBarOverlay 在 Win11 上易出现按钮区灰块，与工具栏色差。）
 */
const SHELL_BACKGROUND = "#252525";

/** @param {Electron.BrowserWindowConstructorOptions} bounds */
function getMainWindowChromeOptions(bounds) {
  const base = {
    ...bounds,
    title: "EasyMotion",
    backgroundColor: SHELL_BACKGROUND,
    autoHideMenuBar: true,
    show: false,
  };

  if (process.platform === "darwin") {
    return {
      ...base,
      titleBarStyle: "hiddenInset",
    };
  }

  return base;
}

module.exports = {
  SHELL_BACKGROUND,
  getMainWindowChromeOptions,
};
