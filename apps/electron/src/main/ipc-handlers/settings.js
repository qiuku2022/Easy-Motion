const { ipcMain } = require("electron");
const settingsService = require("../services/settings-service");
const secretsService = require("../services/secrets-service");
const llmService = require("../services/llm-service");

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

function withLlmMeta(settings) {
  const provider = settings.llm.provider;
  const keyStored = secretsService.hasLlmApiKey(provider);
  const envConfigured = Boolean(
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.LLM_API_KEY
  );

  return {
    ...settings,
    llm: {
      ...settings.llm,
      apiKeyConfigured: keyStored || envConfigured,
      apiKeyStored: keyStored,
    },
  };
}

function registerSettingsHandlers() {
  ipcMain.handle(
    "main:settings:get",
    wrap((payload) => {
      const settings = settingsService.getSettings(payload?.keys);
      return withLlmMeta(settings);
    })
  );

  ipcMain.handle(
    "main:settings:update",
    wrap(async (payload) => {
      if (!payload?.settings || typeof payload.settings !== "object") {
        throw new Error("E2002: 无效的设置参数");
      }
      const result = await settingsService.updateSettings(payload.settings);
      return {
        updated: result.updated,
        settings: withLlmMeta(result.settings),
      };
    })
  );

  ipcMain.handle(
    "main:settings:setLlmApiKey",
    wrap(async (payload) => {
      const provider = payload?.provider || settingsService.getLlmSettings().provider;
      const result = await secretsService.setLlmApiKey(provider, payload?.apiKey);
      return result;
    })
  );

  ipcMain.handle(
    "main:settings:validateLLMKey",
    wrap(async (payload) => {
      const llm = settingsService.getLlmSettings();
      const result = await llmService.validateLlmApiKey({
        provider: payload?.provider || llm.provider,
        baseUrl: payload?.baseUrl || llm.baseUrl,
        model: payload?.model || llm.model,
        apiKey: payload?.apiKey,
      });
      return result;
    })
  );
}

module.exports = { registerSettingsHandlers };
