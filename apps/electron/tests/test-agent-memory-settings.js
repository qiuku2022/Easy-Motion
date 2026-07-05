const settingsService = require("../src/main/services/settings-service");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const defaults = settingsService.normalizeAgentSettings({});
  assert(defaults.creationMode === "free", "default creation mode");
  assert(defaults.memory.enabled === true, "memory enabled by default");
  assert(defaults.memory.autoExtract === false, "auto extract disabled by default");
  assert(defaults.memory.promptBudgetChars === 1200, "default prompt budget");
  assert(defaults.memory.projectMemory === true, "project memory enabled by default");
  assert(defaults.memory.includeInBackups === false, "memory excluded from backups");

  const normalized = settingsService.normalizeAgentSettings({
    creationMode: "auto",
    memory: {
      enabled: false,
      autoExtract: true,
      promptBudgetChars: 2800,
      projectMemory: false,
      includeInBackups: true,
    },
  });
  assert(normalized.creationMode === "auto", "valid mode preserved");
  assert(normalized.memory.enabled === false, "enabled false preserved");
  assert(normalized.memory.autoExtract === true, "auto extract true preserved");
  assert(normalized.memory.promptBudgetChars === 2800, "budget preserved");
  assert(normalized.memory.projectMemory === false, "project memory false preserved");
  assert(normalized.memory.includeInBackups === true, "backup flag preserved");

  const low = settingsService.normalizeAgentSettings({
    creationMode: "invalid",
    memory: { promptBudgetChars: 99 },
  });
  assert(low.creationMode === "free", "invalid mode reset");
  assert(low.memory.promptBudgetChars === 1200, "low budget reset");

  const high = settingsService.normalizeAgentSettings({
    memory: { promptBudgetChars: 9999 },
  });
  assert(high.memory.promptBudgetChars === 1200, "high budget reset");

  console.log("agent memory settings tests passed");
}

main();
