const { ipcMain, dialog } = require("electron");
const projectService = require("../services/project-service");
const { getDefaultProjectsParentDir } = require("../utils/paths");

function wrap(handler) {
  return async (_event, payload) => {
    try {
      const data = await handler(payload);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message || "unknown error",
        },
      };
    }
  };
}

function registerProjectHandlers() {
  ipcMain.handle(
    "main:project:create",
    wrap((payload) => projectService.createProject(payload))
  );

  ipcMain.handle(
    "main:project:open",
    wrap((payload) => projectService.openProject(payload.path))
  );

  ipcMain.handle(
    "main:project:save",
    wrap(() => projectService.saveCurrentProject())
  );

  ipcMain.handle(
    "main:project:listRecent",
    wrap(() => projectService.listRecentProjects())
  );

  ipcMain.handle(
    "main:project:listLocal",
    wrap(() => projectService.listLocalProjects())
  );

  ipcMain.handle(
    "main:project:delete",
    wrap((payload) => projectService.deleteProject(payload.path, payload.options))
  );

  ipcMain.handle(
    "main:project:getCurrent",
    wrap(() => projectService.getCurrentProject())
  );

  ipcMain.handle(
    "main:project:close",
    wrap(() => projectService.closeCurrentProject())
  );

  ipcMain.handle("main:project:pickParentDirectory", async () => {
    const result = await dialog.showOpenDialog({
      title: "选择项目保存位置",
      defaultPath: getDefaultProjectsParentDir(),
      properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: true, data: { path: null } };
    }
    return { success: true, data: { path: result.filePaths[0] } };
  });

  ipcMain.handle("main:project:pickProjectDirectory", async () => {
    const result = await dialog.showOpenDialog({
      title: "打开项目文件夹",
      defaultPath: getDefaultProjectsParentDir(),
      properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: true, data: { path: null } };
    }
    return { success: true, data: { path: result.filePaths[0] } };
  });
}

module.exports = { registerProjectHandlers };
