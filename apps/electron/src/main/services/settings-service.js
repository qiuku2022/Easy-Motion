const fs = require("node:fs");
const path = require("node:path");
const { getConfigDir } = require("../utils/paths");
const { atomicWriteJson, readJsonFile, ensureDir } = require("./file-service");

const SETTINGS_VERSION = "1.0";

const DEFAULT_AGENT_MEMORY_SETTINGS = {
  enabled: true,
  autoExtract: false,
  promptBudgetChars: 1200,
  projectMemory: true,
  includeInBackups: false,
};

const DEFAULT_SETTINGS = {
  version: SETTINGS_VERSION,
  llm: {
    provider: "anthropic",
    baseUrl: "https://api.minimaxi.com/anthropic",
    model: "MiniMax-M3",
    maxTokens: 4096,
    temperature: 0.7,
    timeout: 60,
    streamResponse: true,
  },
  agent: {
    creationMode: "free",
    memory: DEFAULT_AGENT_MEMORY_SETTINGS,
  },
};

const LLM_PROVIDERS = new Set(["openai", "anthropic"]);

let cachedSettings = null;
let testConfigDir = null;

function getSettingsPath() {
  return path.join(testConfigDir ?? getConfigDir(), "settings.json");
}

function deepMerge(target, source) {
  const next = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      next[key] = deepMerge(target[key], value);
    } else {
      next[key] = value;
    }
  }
  return next;
}

function normalizeLlmSettings(llm = {}) {
  const provider = LLM_PROVIDERS.has(llm.provider) ? llm.provider : "anthropic";
  const maxTokens = Number(llm.maxTokens);
  const temperature = Number(llm.temperature);
  const timeout = Number(llm.timeout);

  return {
    provider,
    baseUrl:
      typeof llm.baseUrl === "string" && llm.baseUrl.trim()
        ? llm.baseUrl.trim()
        : DEFAULT_SETTINGS.llm.baseUrl,
    model:
      typeof llm.model === "string" && llm.model.trim()
        ? llm.model.trim()
        : DEFAULT_SETTINGS.llm.model,
    maxTokens:
      Number.isFinite(maxTokens) && maxTokens >= 256 && maxTokens <= 8192
        ? maxTokens
        : DEFAULT_SETTINGS.llm.maxTokens,
    temperature:
      Number.isFinite(temperature) && temperature >= 0 && temperature <= 2
        ? temperature
        : DEFAULT_SETTINGS.llm.temperature,
    timeout:
      Number.isFinite(timeout) && timeout >= 10 && timeout <= 300
        ? timeout
        : DEFAULT_SETTINGS.llm.timeout,
    streamResponse: llm.streamResponse !== false,
  };
}

function normalizeAgentSettings(agent = {}) {
  const modes = new Set(["quick", "free", "auto"]);
  const memory = agent.memory && typeof agent.memory === "object" ? agent.memory : {};
  const promptBudgetChars = Number(memory.promptBudgetChars);

  return {
    creationMode: modes.has(agent.creationMode) ? agent.creationMode : "free",
    memory: {
      enabled: memory.enabled !== false,
      autoExtract: memory.autoExtract === true,
      promptBudgetChars:
        Number.isFinite(promptBudgetChars) &&
        promptBudgetChars >= 300 &&
        promptBudgetChars <= 3000
          ? promptBudgetChars
          : DEFAULT_AGENT_MEMORY_SETTINGS.promptBudgetChars,
      projectMemory: memory.projectMemory !== false,
      includeInBackups: memory.includeInBackups === true,
    },
  };
}

function normalizeSettings(raw) {
  const merged = deepMerge(DEFAULT_SETTINGS, raw && typeof raw === "object" ? raw : {});
  return {
    ...merged,
    version: SETTINGS_VERSION,
    llm: normalizeLlmSettings(merged.llm),
    agent: normalizeAgentSettings(merged.agent),
  };
}

function loadSettingsFromDisk() {
  const filePath = getSettingsPath();
  ensureDir(path.dirname(filePath));

  if (!fs.existsSync(filePath)) {
    return normalizeSettings({});
  }

  try {
    const raw = readJsonFile(filePath);
    return normalizeSettings(raw);
  } catch {
    throw new Error("E2002: settings.json 格式无效");
  }
}

function getSettings(keys) {
  if (!cachedSettings) {
    cachedSettings = loadSettingsFromDisk();
  }

  if (!Array.isArray(keys) || keys.length === 0) {
    return cachedSettings;
  }

  const picked = {};
  for (const key of keys) {
    if (key in cachedSettings) {
      picked[key] = cachedSettings[key];
    }
  }
  return picked;
}

function getLlmSettings() {
  return getSettings().llm;
}

async function updateSettings(partial) {
  if (!partial || typeof partial !== "object") {
    throw new Error("E2002: 无效的设置参数");
  }

  const current = getSettings();
  const next = normalizeSettings(deepMerge(current, partial));
  cachedSettings = next;
  await atomicWriteJson(getSettingsPath(), next);
  return { updated: true, settings: next };
}

function resetSettingsCache() {
  cachedSettings = null;
}

function setSettingsConfigDirForTest(configDir) {
  testConfigDir = configDir || null;
  resetSettingsCache();
}

module.exports = {
  DEFAULT_SETTINGS,
  DEFAULT_AGENT_MEMORY_SETTINGS,
  LLM_PROVIDERS,
  getSettings,
  getLlmSettings,
  updateSettings,
  resetSettingsCache,
  setSettingsConfigDirForTest,
  normalizeLlmSettings,
  normalizeAgentSettings,
};
