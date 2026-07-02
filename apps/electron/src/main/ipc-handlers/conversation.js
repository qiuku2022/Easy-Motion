const { ipcMain, dialog } = require("electron");
const conversationService = require("../services/conversation-service");
const projectService = require("../services/project-service");
const agentService = require("../services/agent-service");
const aiRefService = require("../services/ai-ref-service");
function wrap(handler) {
  return async (event, payload) => {
    try {
      const data = await handler(event, payload);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: { message: error.message || "unknown error" },
      };
    }
  };
}

function getProjectContext(payload) {
  const current = projectService.getCurrentProject();
  const projectPath = payload?.projectPath ?? current?.path;
  if (!projectPath || !current?.data) {
    throw new Error("E2105: no open project");
  }

  const subprojectPath = conversationService.resolveSubprojectPath(
    current.data,
    payload
  );

  return { projectPath, subprojectPath, project: current.data };
}

function registerConversationHandlers() {
  ipcMain.handle(
    "main:conversation:load",
    wrap((_event, payload) => {
      const { projectPath, subprojectPath } = getProjectContext(payload);
      const conversation = conversationService.loadConversation(
        projectPath,
        subprojectPath
      );
      const pendingAgentUndo = conversationService.resolvePendingAgentUndo(
        projectPath,
        subprojectPath
      );
      return {
        conversation,
        subprojectPath,
        subprojectId: payload?.subprojectId,
        pendingAgentUndo,
      };
    })
  );

  ipcMain.handle(
    "main:conversation:save",
    wrap(async (_event, payload) => {
      if (!payload?.conversation) {
        throw new Error("E2002: 无效的对话数据");
      }
      const { projectPath, subprojectPath } = getProjectContext(payload);
      return conversationService.saveConversation(
        projectPath,
        payload.conversation,
        subprojectPath
      );
    })
  );

  ipcMain.handle(
    "main:conversation:clear",
    wrap(async (_event, payload) => {
      const { projectPath, subprojectPath } = getProjectContext(payload);
      return conversationService.clearConversation(projectPath, subprojectPath);
    })
  );

  ipcMain.handle(
    "main:conversation:saveAgentUndo",
    wrap(async (_event, payload) => {
      const remotionFilesBefore = Array.isArray(payload?.remotionFilesBefore)
        ? payload.remotionFilesBefore
        : [];
      if (!payload?.messageId || (!payload?.timeline && remotionFilesBefore.length === 0)) {
        throw new Error("E2002: 无效的撤销快照");
      }
      const { projectPath, subprojectPath } = getProjectContext(payload);
      return conversationService.saveAgentUndoSnapshot(
        projectPath,
        subprojectPath,
        {
          messageId: payload.messageId,
          timeline: payload.timeline,
          remotionFilesBefore,
        }
      );
    })
  );

  ipcMain.handle(
    "main:conversation:restoreAgentUndo",
    wrap(async (_event, payload) => {
      const { projectPath, subprojectPath } = getProjectContext(payload);
      return conversationService.restoreAgentUndoSnapshot(
        projectPath,
        subprojectPath,
        { messageId: payload?.messageId }
      );
    })
  );

  ipcMain.handle(
    "main:conversation:clearAgentUndo",
    wrap(async (_event, payload) => {
      const { projectPath, subprojectPath } = getProjectContext(payload);
      return conversationService.clearAgentUndoSnapshot(projectPath, subprojectPath);
    })
  );

  ipcMain.handle("main:conversation:pickAiRefs", async (_event, payload) => {
    try {
      const { projectPath } = getProjectContext(payload ?? {});
      const result = await dialog.showOpenDialog({
        title: "添加参考图",
        properties: ["openFile", "multiSelections"],
        filters: [
          {
            name: "图片",
            extensions: ["png", "jpg", "jpeg", "webp", "gif"],
          },
        ],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: true, data: { images: [] } };
      }

      const data = await aiRefService.importAiRefFiles(
        projectPath,
        result.filePaths
      );
      data.images = data.images.map((image) => ({
        ...image,
        previewUrl: aiRefService.readAiRefAsDataUrl(projectPath, image.path),
      }));
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: { message: error.message || "unknown error" },
      };
    }
  });

  ipcMain.handle("main:conversation:readAiRefPreview", async (_event, payload) => {
    try {
      const { projectPath } = getProjectContext(payload ?? {});
      const dataUrl = aiRefService.readAiRefAsDataUrl(
        projectPath,
        payload?.path || payload?.relativePath
      );
      return { success: true, data: { dataUrl } };
    } catch (error) {
      return {
        success: false,
        error: { message: error.message || "unknown error" },
      };
    }
  });

  ipcMain.handle(
    "main:conversation:send",
    wrap((event, payload) => agentService.startConversationSend(event.sender, payload))
  );

  ipcMain.handle(
    "main:conversation:cancel",
    wrap((_event, payload) =>
      agentService.cancelConversationSend(payload?.requestId)
    )
  );
}

module.exports = { registerConversationHandlers };
