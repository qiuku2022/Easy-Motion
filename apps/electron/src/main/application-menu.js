const { app, Menu } = require("electron");

/**
 * Windows/Linux：移除 Electron 默认英文菜单（File / Edit / View / Window）。
 * UI 规范使用 TopToolbar + 汉堡菜单，见 UI布局与交互设计-优化版.md。
 * macOS：保留系统菜单栏，文案为中文。
 */
function installApplicationMenu() {
  if (process.platform === "darwin") {
    const template = [
      {
        label: app.name,
        submenu: [
          { role: "about", label: `关于 ${app.name}` },
          { type: "separator" },
          { role: "services", label: "服务" },
          { type: "separator" },
          { role: "hide", label: `隐藏 ${app.name}` },
          { role: "hideOthers", label: "隐藏其他" },
          { role: "unhide", label: "显示全部" },
          { type: "separator" },
          { role: "quit", label: `退出 ${app.name}` },
        ],
      },
      {
        label: "编辑",
        submenu: [
          { role: "undo", label: "撤销" },
          { role: "redo", label: "重做" },
          { type: "separator" },
          { role: "cut", label: "剪切" },
          { role: "copy", label: "复制" },
          { role: "paste", label: "粘贴" },
          { role: "pasteAndMatchStyle", label: "粘贴并匹配样式" },
          { role: "delete", label: "删除" },
          { role: "selectAll", label: "全选" },
        ],
      },
      {
        label: "视图",
        submenu: [
          { role: "reload", label: "重新加载" },
          { role: "forceReload", label: "强制重新加载" },
          { role: "toggleDevTools", label: "切换开发者工具" },
          { type: "separator" },
          { role: "resetZoom", label: "实际大小" },
          { role: "zoomIn", label: "放大" },
          { role: "zoomOut", label: "缩小" },
          { type: "separator" },
          { role: "togglefullscreen", label: "切换全屏" },
        ],
      },
      {
        label: "窗口",
        submenu: [
          { role: "minimize", label: "最小化" },
          { role: "zoom", label: "缩放" },
          { type: "separator" },
          { role: "front", label: "置于顶层" },
        ],
      },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    return;
  }

  Menu.setApplicationMenu(null);
}

module.exports = {
  installApplicationMenu,
};
