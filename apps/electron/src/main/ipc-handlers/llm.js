const { ipcMain } = require("electron");
const llmService = require("../services/llm-service");

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

function registerLlmHandlers() {
  ipcMain.handle(
    "main:llm:stream",
    wrap((event, payload) =>
      llmService.startStream(event.sender, payload)
    )
  );

  ipcMain.handle(
    "main:llm:cancel",
    wrap((_event, payload) =>
      llmService.cancelStream(payload?.requestId)
    )
  );
}

module.exports = { registerLlmHandlers };
