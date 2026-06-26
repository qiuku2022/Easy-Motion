const path = require("node:path");
const { ipcMain, dialog } = require("electron");
const exportService = require("../services/export-service");
const projectService = require("../services/project-service");

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

function registerExportHandlers() {
  ipcMain.handle(
    "main:export:start",
    wrap(async (payload) => {
      const projectPath = getProjectRoot(payload);
      return exportService.startVideoExport({
        projectPath,
        subprojectPath: payload?.subprojectPath,
        format: payload?.format ?? "mp4",
        resolution: payload?.resolution ?? "original",
        quality: payload?.quality ?? "medium",
        outputPath: payload?.outputPath,
      });
    }),
  );

  ipcMain.handle(
    "main:export:cancel",
    wrap(async (payload) => {
      if (!payload?.exportId) {
        throw new Error("E2602: export id required");
      }
      return exportService.cancelExport(payload.exportId);
    }),
  );

  ipcMain.handle(
    "main:export:pickOutput",
    wrap(async (payload) => {
      const ext = payload?.format === "webm" ? "webm" : "mp4";
      const defaultPath =
        typeof payload?.defaultPath === "string" ? payload.defaultPath : undefined;
      const result = await dialog.showSaveDialog({
        defaultPath,
        filters: [{ name: "Video", extensions: [ext] }],
      });
      if (result.canceled || !result.filePath) {
        return { path: null };
      }
      let filePath = result.filePath;
      if (!filePath.toLowerCase().endsWith(`.${ext}`)) {
        filePath = `${filePath}.${ext}`;
      }
      return { path: filePath };
    }),
  );

  ipcMain.handle(
    "main:export:project",
    wrap(async (payload) => {
      const projectPath = getProjectRoot(payload);
      return exportService.startProjectExport({
        projectPath,
        subprojectPath: payload?.subprojectPath,
        outputZipPath: payload?.outputZipPath,
        includeAssets: payload?.includeAssets !== false,
      });
    }),
  );

  ipcMain.handle(
    "main:export:pickProjectOutput",
    wrap(async (payload) => {
      const defaultPath =
        typeof payload?.defaultPath === "string" ? payload.defaultPath : undefined;
      const result = await dialog.showSaveDialog({
        defaultPath,
        filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
      });
      if (result.canceled || !result.filePath) {
        return { path: null };
      }
      let filePath = result.filePath;
      if (!filePath.toLowerCase().endsWith(".zip")) {
        filePath = `${filePath}.zip`;
      }
      return { path: filePath };
    }),
  );

  ipcMain.handle(
    "main:export:getActive",
    wrap(() => exportService.getActiveExport()),
  );
}

module.exports = { registerExportHandlers };
