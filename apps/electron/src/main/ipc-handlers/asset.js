const { ipcMain, dialog } = require("electron");
const projectService = require("../services/project-service");
const assetService = require("../services/asset-service");
const timelineService = require("../services/timeline-service");

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

function requireProject() {
  const current = projectService.getCurrentProject();
  if (!current?.path) {
    throw new Error("E2001: no project open");
  }
  return current.path;
}

function registerAssetHandlers() {
  ipcMain.handle(
    "main:asset:list",
    wrap(() => {
      const projectPath = requireProject();
      return assetService.listAssets(projectPath);
    }),
  );

  ipcMain.handle(
    "main:asset:import",
    wrap(async (payload) => {
      const projectPath = requireProject();
      const filePaths = payload?.filePaths ?? [];
      if (!Array.isArray(filePaths) || filePaths.length === 0) {
        throw new Error("未选择文件");
      }

      let fps = payload?.fps ?? 30;
      try {
        const timeline = timelineService.loadTimeline(
          projectPath,
          payload?.subprojectPath,
        );
        fps = timeline.fps ?? fps;
      } catch {
        /* use default fps */
      }

      return assetService.importAssetFiles(projectPath, filePaths, {
        subprojectPath: payload?.subprojectPath,
        fps,
      });
    }),
  );

  ipcMain.handle("main:asset:pickAndImport", async (_event, payload) => {
    try {
      const projectPath = requireProject();
      const result = await dialog.showOpenDialog({
        title: "导入素材",
        properties: ["openFile", "multiSelections"],
        filters: [
          {
            name: "媒体文件",
            extensions: [
              "png",
              "jpg",
              "jpeg",
              "webp",
              "gif",
              "svg",
              "mp4",
              "mov",
              "webm",
              "mp3",
              "wav",
              "aac",
              "m4a",
            ],
          },
        ],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: true, data: { imported: [], errors: [], assets: [] } };
      }

      let fps = payload?.fps ?? 30;
      try {
        const timeline = timelineService.loadTimeline(
          projectPath,
          payload?.subprojectPath,
        );
        fps = timeline.fps ?? fps;
      } catch {
        /* default */
      }

      const data = await assetService.importAssetFiles(
        projectPath,
        result.filePaths,
        {
          subprojectPath: payload?.subprojectPath,
          fps,
        },
      );
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: { message: error.message || "unknown error" },
      };
    }
  });
}

module.exports = { registerAssetHandlers };
