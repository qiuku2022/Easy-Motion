const { ipcMain } = require("electron");
const memoryService = require("../services/memory-service");
const settingsService = require("../services/settings-service");
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

function getProjectRoot(required = false) {
  const current = projectService.getCurrentProject();
  if (!current?.path) {
    if (required) throw new Error("E2105: no open project");
    return null;
  }
  return current.path;
}

function resolveProjectRootForScope(scope, required = false) {
  if (scope === "project" || scope === "all" || required) {
    return getProjectRoot(required || scope === "project");
  }
  return getProjectRoot(false);
}

function registerMemoryHandlers() {
  ipcMain.handle(
    "main:memory:list",
    wrap((payload = {}) => {
      const scope = payload.scope ?? "all";
      return memoryService.listMemory({
        scope,
        projectRoot: resolveProjectRootForScope(scope),
      });
    })
  );

  ipcMain.handle(
    "main:memory:writeNote",
    wrap(async (payload = {}) => {
      const scope = payload.scope ?? "global";
      return memoryService.writeNote({
        ...payload,
        scope,
        projectRoot: resolveProjectRootForScope(scope, scope === "project"),
        source: "manual-edit",
      });
    })
  );

  ipcMain.handle(
    "main:memory:updatePreference",
    wrap(async (payload = {}) => {
      const scope = payload.scope ?? "global";
      return memoryService.updatePreference({
        ...payload,
        scope,
        projectRoot: resolveProjectRootForScope(scope, scope === "project"),
        source: "manual-edit",
      });
    })
  );

  ipcMain.handle(
    "main:memory:delete",
    wrap(async (payload = {}) => {
      const scope = payload.scope ?? "global";
      return memoryService.deleteMemoryItem({
        ...payload,
        scope,
        projectRoot: resolveProjectRootForScope(scope, scope === "project"),
      });
    })
  );

  ipcMain.handle(
    "main:memory:clear",
    wrap(async (payload = {}) => {
      const scope = payload.scope ?? "global";
      return memoryService.clearMemory({
        scope,
        projectRoot: resolveProjectRootForScope(scope, scope === "project"),
      });
    })
  );

  ipcMain.handle(
    "main:memory:getSettings",
    wrap(() => memoryService.getMemorySettings())
  );

  ipcMain.handle(
    "main:memory:updateSettings",
    wrap(async (payload = {}) => {
      const result = await settingsService.updateSettings({
        agent: {
          memory: payload.settings ?? payload.memory ?? payload,
        },
      });
      return result.settings.agent.memory;
    })
  );
}

module.exports = { registerMemoryHandlers };
