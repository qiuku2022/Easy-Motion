const { ipcMain } = require("electron");
const projectService = require("../services/project-service");
const workspaceService = require("../services/workspace-service");

function wrap(handler) {
  return async (_event, payload) => {
    try {
      const data = await handler(payload);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: { message: error.message || "unknown error" },
      };
    }
  };
}

function getProjectRoot(payload) {
  const current = projectService.getCurrentProject();
  const projectPath = payload?.projectPath ?? current?.path;
  if (!projectPath) {
    throw new Error("E2105: no open project");
  }
  return projectPath;
}

function registerWorkspaceHandlers() {
  ipcMain.handle(
    "main:workspace:load",
    wrap((payload) => {
      const projectPath = getProjectRoot(payload);
      return workspaceService.loadWorkspace(projectPath, payload?.subprojectPath);
    }),
  );

  ipcMain.handle(
    "main:workspace:save",
    wrap(async (payload) => {
      const projectPath = getProjectRoot(payload);
      return workspaceService.saveWorkspace(
        projectPath,
        payload?.subprojectPath,
        payload?.patch ?? {},
      );
    }),
  );
}

module.exports = { registerWorkspaceHandlers };
