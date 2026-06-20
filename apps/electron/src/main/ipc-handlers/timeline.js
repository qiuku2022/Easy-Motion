const { ipcMain } = require("electron");
const timelineService = require("../services/timeline-service");
const projectService = require("../services/project-service");
const previewService = require("../services/preview-service");

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

function registerTimelineHandlers() {
  ipcMain.handle(
    "main:timeline:load",
    wrap((payload) => {
      const projectPath = getProjectRoot(payload);
      return timelineService.loadTimeline(projectPath, payload?.subprojectPath);
    })
  );

  ipcMain.handle(
    "main:timeline:save",
    wrap(async (payload) => {
      const projectPath = getProjectRoot(payload);
      return timelineService.saveTimeline(
        projectPath,
        payload.timeline,
        payload?.subprojectPath
      );
    })
  );

  ipcMain.handle(
    "main:timeline:applySample",
    wrap((payload) => {
      const projectPath = getProjectRoot(payload);
      return timelineService.applySampleTimeline(projectPath, payload?.subprojectPath);
    })
  );

  ipcMain.handle(
    "main:timeline:checkRemotionDrift",
    wrap((payload) => {
      const projectPath = getProjectRoot(payload);
      return timelineService.checkRemotionDrift(projectPath, payload?.subprojectPath);
    }),
  );

  ipcMain.handle(
    "main:timeline:syncFromRemotion",
    wrap(async (payload) => {
      const projectPath = getProjectRoot(payload);
      return timelineService.syncTimelineFromRemotion(
        projectPath,
        payload?.subprojectPath,
        { preserveTracks: payload?.preserveTracks },
      );
    }),
  );

  ipcMain.handle(
    "main:timeline:syncPreviewManifest",
    wrap(async (payload) => {
      const projectPath = getProjectRoot(payload);
      const subprojectPath = payload?.subprojectPath;
      const remotionDir = previewService.getRemotionDir(projectPath, subprojectPath);
      const soloSupportPatched = previewService.ensurePreviewSoloSupport(remotionDir);
      const result = timelineService.syncPreviewManifest(
        projectPath,
        payload.timeline,
        subprojectPath,
      );
      const state = previewService.getPreviewState();
      if (state.status === "running") {
        return {
          ...result,
          previewReload: soloSupportPatched,
          timelinePush: !soloSupportPatched,
        };
      }
      return result;
    }),
  );

  ipcMain.handle(
    "main:timeline:generate",
    wrap(async (payload) => {
      const projectPath = getProjectRoot(payload);
      const subprojectPath = payload?.subprojectPath;
      const result = timelineService.generateForSubproject(
        projectPath,
        subprojectPath,
      );
      const remotionDir = previewService.getRemotionDir(projectPath, subprojectPath);
      const entryPatched = previewService.ensurePreviewEntry(remotionDir);
      const soloPatched = previewService.ensurePreviewSoloSupport(remotionDir);
      let refreshed = null;
      if (entryPatched || soloPatched) {
        refreshed = timelineService.refreshRemotionFingerprint(
          projectPath,
          subprojectPath,
        );
      }
      const state = previewService.getPreviewState();
      if (state.status === "running") {
        return {
          ...result,
          previewReload: true,
          previewUrl: state.url,
          timeline: refreshed?.timeline,
        };
      }
      return refreshed?.timeline ? { ...result, timeline: refreshed.timeline } : result;
    })
  );
}

module.exports = { registerTimelineHandlers };
