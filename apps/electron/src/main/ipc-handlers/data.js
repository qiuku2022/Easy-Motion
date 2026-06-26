const { ipcMain, dialog } = require("electron");
const projectService = require("../services/project-service");
const dataService = require("../services/data-service");

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

function requireProject() {
  const current = projectService.getCurrentProject();
  if (!current?.path) {
    throw new Error("E2001: no project open");
  }
  return current.path;
}

function registerDataHandlers() {
  ipcMain.handle("main:data:pickAndParse", async () => {
    try {
      const projectPath = requireProject();
      const result = await dialog.showOpenDialog({
        title: "选择数据文件",
        properties: ["openFile"],
        filters: [
          { name: "数据文件", extensions: ["csv", "json"] },
        ],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: true, data: null };
      }

      const imported = await dataService.importDataFileToProject(
        projectPath,
        result.filePaths[0],
      );
      return { success: true, data: imported };
    } catch (error) {
      return {
        success: false,
        error: { message: error.message || "unknown error" },
      };
    }
  });

  ipcMain.handle(
    "main:data:mapChart",
    wrap((payload) => {
      const rows = payload?.rows ?? [];
      const xField = payload?.xField;
      const yField = payload?.yField;
      if (!xField || !yField) {
        throw new Error("请选择 X/Y 字段");
      }
      return {
        data: dataService.mapRowsToChartData(rows, xField, yField),
      };
    }),
  );
}

module.exports = { registerDataHandlers };
